<?php

if (class_exists('\phpDocumentor\Reflection\DocBlockFactory')) {
    $factory = \phpDocumentor\Reflection\DocBlockFactory::createInstance();
} else {
    $factory = null;
}

$docblocks = new class($factory) {
    public function __construct(protected $factory) {}

    public function forMethod($method)
    {
        if ($this->factory !== null) {
            $docblock = $this->factory->create($method->getDocComment());
            $params = collect($docblock->getTagsByName("param"))->map(fn($p) => (string) $p)->all();
            $return = (string) $docblock->getTagsByName("return")[0] ?? null;

            return [$params, $return];
        }


        $params = collect($method->getParameters())
            ->map(function (\ReflectionParameter $param) {
                $types = match ($param?->getType()) {
                    null => [],
                    default => method_exists($param->getType(), "getTypes")
                        ? $param->getType()->getTypes()
                        : [$param->getType()]
                };

                $types = collect($types)
                    ->filter()
                    ->values()
                    ->map(fn($t) => $t->getName());

                return trim($types->join("|") . " $" . $param->getName());
            })
            ->all();

        $return = $method->getReturnType()?->getName();

        return [$params, $return];
    }
};

$models = new class($factory) {
    protected $output;

    public function __construct(protected $factory)
    {
        $this->output = new \Symfony\Component\Console\Output\BufferedOutput();
    }

    public function all()
    {
            if (\Illuminate\Support\Facades\File::isDirectory(base_path('app/Models'))) {
                collect(\Illuminate\Support\Facades\File::allFiles(base_path('app/Models')))
                    ->filter(fn(\Symfony\Component\Finder\SplFileInfo $file) => $file->getExtension() === 'php')
                    ->each(fn($file) => include_once($file));
            }

        return collect(get_declared_classes())
            ->filter(fn($class) => is_subclass_of($class, \Illuminate\Database\Eloquent\Model::class))
            ->filter(fn($class) => !in_array($class, [\Illuminate\Database\Eloquent\Relations\Pivot::class, \Illuminate\Foundation\Auth\User::class]))
            ->values()
            ->flatMap(fn(string $className) => $this->getInfo($className))
            ->filter();
    }

    protected function getCastReturnType($className)
    {
        if ($className === null) {
            return null;
        }

        try {
            $method = (new \ReflectionClass($className))->getMethod('get');

            if ($method->hasReturnType()) {
                return $method->getReturnType()->getName();
            }

            return $className;
        } catch (\Exception | \Throwable $e) {
            return $className;
        }
    }

    protected function fromArtisan($className)
    {
        try {
            \Illuminate\Support\Facades\Artisan::call(
                "model:show",
                [
                    "model" => $className,
                    "--json" => true,
                ],
                $this->output
            );
        } catch (\Exception | \Throwable $e) {
            return null;
        }

        return json_decode($this->output->fetch(), true);
    }

    protected function collectExistingProperties($reflection)
    {
        if ($this->factory === null) {
            return collect();
        }

        if ($comment = $reflection->getDocComment()) {
            $docblock = $this->factory->create($comment);

            $existingProperties = collect($docblock->getTagsByName("property"))->map(fn($p) => $p->getVariableName());
            $existingReadProperties = collect($docblock->getTagsByName("property-read"))->map(fn($p) => $p->getVariableName());

            return $existingProperties->merge($existingReadProperties);
        }

        return collect();
    }

    protected function getParentClass(\ReflectionClass $reflection)
    {
        if (!$reflection->getParentClass()) {
            return null;
        }

        $parent = $reflection->getParentClass()->getName();

        if ($parent === \Illuminate\Database\Eloquent\Model::class) {
            return null;
        }

        return \Illuminate\Support\Str::start($parent, '\\');
    }

    protected function getInfo($className)
    {
        if (($data = $this->fromArtisan($className)) === null) {
            return null;
        }

        $reflection = new \ReflectionClass($className);

        $data["extends"] = $this->getParentClass($reflection);

        $existingProperties = $this->collectExistingProperties($reflection);

        $data['attributes'] = collect($data['attributes'])
            ->map(fn($attrs) => array_merge($attrs, [
                'title_case' => str($attrs['name'])->title()->replace('_', '')->toString(),
                'documented' => $existingProperties->contains($attrs['name']),
                'cast' =>  $this->getCastReturnType($attrs['cast'])
            ]))
            ->toArray();

        $data['scopes'] = collect($reflection->getMethods())
            ->filter(fn(\ReflectionMethod $method) => !$method->isStatic() && ($method->getAttributes(\Illuminate\Database\Eloquent\Attributes\Scope::class) || ($method->isPublic() && str_starts_with($method->name, 'scope'))))
            ->map(fn(\ReflectionMethod $method) => [
                "name" => str($method->name)->replace('scope', '')->lcfirst()->toString(),
                "parameters" => collect($method->getParameters())->map($this->getScopeParameterInfo(...)),
            ])
            ->values()
            ->toArray();

        $data['uri'] = $reflection->getFileName();

        return [
            $className => $data,
        ];
    }

    protected function getScopeParameterInfo(\ReflectionParameter $parameter): array
    {
        $result = [
            "name" => $parameter->getName(),
            "type" => $this->typeToString($parameter->getType()),
            "hasDefault" => $parameter->isDefaultValueAvailable(),
            "isVariadic" => $parameter->isVariadic(),
        ];

        if ($parameter->isDefaultValueAvailable()) {
            $result['default'] = $this->defaultValueToString($parameter->getDefaultValue());
        }

        return $result;
    }

    protected function typeToString(?ReflectionType $type): string
    {
        if ($type instanceof ReflectionNamedType) {
            $name = $type->getName();

            if (! $type->isBuiltin()) {
                $name = '\\' . ltrim($name, '\\');
            }

            if ($type->allowsNull() && ! in_array($name, ['null', 'mixed', 'void'])) {
                return '?'.$name;
            }

            return $name;
        }

        if ($type instanceof ReflectionUnionType) {
            return implode('|', array_map($this->typeToString(...), $type->getTypes()));
        }

        if ($type instanceof ReflectionIntersectionType) {
            return implode('&', array_map($this->typeToString(...), $type->getTypes()));
        }

        return 'mixed';
    }

    protected function defaultValueToString(mixed $value): string
    {
        return match (true) {
            is_null($value) => 'null',
            is_numeric($value) => $value,
            is_bool($value) => $value ? 'true' : 'false',
            is_array($value) => '[...]',
            is_object($value) && enum_exists(get_class($value)) => '\\' . get_class($value) . '::' . $value->name,
            is_object($value) => '\\' . get_class($value),
            default => "'{$value}'",
        };
    }
};

$builder = new class($docblocks) {
    public function __construct(protected $docblocks) {}

    public function methods()
    {
        $reflection = new \ReflectionClass(\Illuminate\Database\Query\Builder::class);

        return collect($reflection->getMethods(\ReflectionMethod::IS_PUBLIC | \ReflectionMethod::IS_PROTECTED))
            ->filter(fn(ReflectionMethod $method) => !str_starts_with($method->getName(), "__") || (!$method->isPublic() && empty($method->getAttributes(\Illuminate\Database\Eloquent\Attributes\Scope::class))))
            ->map(fn(\ReflectionMethod $method) => $this->getMethodInfo($method))
            ->filter()
            ->values();
    }

    protected function getMethodInfo($method)
    {
        [$params, $return] = $this->docblocks->forMethod($method);

        return [
            "name" => $method->getName(),
            "parameters" => $params,
            "return" => $return,
        ];
    }
};

echo json_encode([
    'builderMethods' => $builder->methods(),
    'models' => $models->all(),
]);
