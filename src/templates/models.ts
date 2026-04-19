// This file was generated from php-templates/models.php, do not edit directly
export default `
if (class_exists('\\phpDocumentor\\Reflection\\DocBlockFactory')) {
    $factory = \\phpDocumentor\\Reflection\\DocBlockFactory::createInstance();
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
            ->map(function (\\ReflectionParameter $param) {
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
        $this->output = new \\Symfony\\Component\\Console\\Output\\BufferedOutput();
    }

    public function all()
    {
        if (\\Illuminate\\Support\\Facades\\File::isDirectory(base_path('app/Models'))) {
            collect(\\Illuminate\\Support\\Facades\\File::allFiles(base_path('app/Models')))
                ->filter(fn(\\Symfony\\Component\\Finder\\SplFileInfo $file) => $file->getExtension() === 'php')
                ->each(fn($file) => include_once($file));
        }

        return collect(get_declared_classes())
            ->filter(fn($class) => is_subclass_of($class, \\Illuminate\\Database\\Eloquent\\Model::class))
            ->filter(fn($class) => !in_array($class, [\\Illuminate\\Database\\Eloquent\\Relations\\Pivot::class, \\Illuminate\\Foundation\\Auth\\User::class]))
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
            $method = (new \\ReflectionClass($className))->getMethod('get');

            if ($method->hasReturnType()) {
                return $method->getReturnType()->getName();
            }

            return $className;
        } catch (\\Exception | \\Throwable $e) {
            return $className;
        }
    }

    protected function fromArtisan($className)
    {
        try {
            \\Illuminate\\Support\\Facades\\Artisan::call(
                "model:show",
                [
                    "model" => $className,
                    "--json" => true,
                ],
                $this->output
            );
        } catch (\\Exception | \\Throwable $e) {
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

    protected function getParentClass(\\ReflectionClass $reflection)
    {
        if (!$reflection->getParentClass()) {
            return null;
        }

        $parent = $reflection->getParentClass()->getName();

        if ($parent === \\Illuminate\\Database\\Eloquent\\Model::class) {
            return null;
        }

        return \\Illuminate\\Support\\Str::start($parent, '\\\\');
    }

    protected function collectTraitUseAnnotations(\\ReflectionClass $reflection)
    {
        $fileName = $reflection->getFileName();

        if (!$fileName || !file_exists($fileName)) {
            return [];
        }

        $source = file_get_contents($fileName);

        $imports = [];
        $classPos = preg_match('/^\\s*(?:abstract\\s+|final\\s+|readonly\\s+)*class\\s+/m', $source, $classMatch, PREG_OFFSET_CAPTURE)
            ? $classMatch[0][1]
            : strlen($source);

        $headerSource = substr($source, 0, $classPos);

        if (preg_match_all('/^\\s*use\\s+([\\w\\\\\\\\]+?)(?:\\s+as\\s+(\\w+))?\\s*;/m', $headerSource, $importMatches, PREG_SET_ORDER)) {
            foreach ($importMatches as $im) {
                $fqcn = $im[1];
                $alias = $im[2] ?? substr(strrchr($fqcn, '\\\\'), 1) ?: $fqcn;
                $imports[$alias] = $fqcn;
            }
        }

        $traitUses = [];
        $bodySource = substr($source, $classPos);

        if (preg_match_all('/\\/\\*\\*(?:[^*]|\\*(?!\\/))*?@use\\s+([^\\s*]+)(?:[^*]|\\*(?!\\/))*?\\*\\/\\s*\\n\\s*use\\s+([^;]+);/m', $bodySource, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $annotation = trim($match[1]);
                $traits = trim($match[2]);

                $resolvedAnnotation = preg_replace_callback('/^([\\w]+)/', function ($m) use ($imports) {
                    return isset($imports[$m[1]])
                        ? '\\\\' . $imports[$m[1]]
                        : $m[1];
                }, $annotation);

                $resolvedTraits = collect(explode(',', $traits))
                    ->map(function ($trait) use ($imports) {
                        $trait = trim($trait);
                        return isset($imports[$trait])
                            ? '\\\\' . $imports[$trait]
                            : $trait;
                    })
                    ->implode(', ');

                $traitUses[] = [
                    'annotation' => $resolvedAnnotation,
                    'traits' => $resolvedTraits,
                ];
            }
        }

        return $traitUses;
    }

    protected function getInfo($className)
    {
        if (($data = $this->fromArtisan($className)) === null) {
            return null;
        }

        $reflection = new \\ReflectionClass($className);

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
            ->filter(fn(\\ReflectionMethod $method) => !$method->isStatic() && ($method->getAttributes(\\Illuminate\\Database\\Eloquent\\Attributes\\Scope::class) || ($method->isPublic() && str_starts_with($method->name, 'scope'))))
            ->map(fn(\\ReflectionMethod $method) => [
                "name" => str($method->name)->replace('scope', '')->lcfirst()->toString(),
                "method" => $method->name,
                "parameters" => collect($method->getParameters())->map($this->getScopeParameterInfo(...)),
            ])
            ->values()
            ->toArray();

        $data['relations'] = collect($data['relations'])
            ->map(fn($relation) => array_merge($relation, [
                'snake_case' => \\Illuminate\\Support\\Str::snake($relation['name']),
            ]))
            ->toArray();

        $data['path'] = LaravelVsCode::relativePath($reflection->getFileName() ?: '');

        $data['traitUses'] = $this->collectTraitUseAnnotations($reflection);

        return [
            $className => $data,
        ];
    }

    protected function getScopeParameterInfo(\\ReflectionParameter $parameter): array
    {
        $result = [
            "name" => $parameter->getName(),
            "type" => $this->typeToString($parameter->getType()),
            "hasDefault" => $parameter->isDefaultValueAvailable(),
            "isVariadic" => $parameter->isVariadic(),
            "isPassedByReference" => $parameter->isPassedByReference(),
        ];

        if ($parameter->isDefaultValueAvailable()) {
            $result['default'] = $this->defaultValueToString($parameter);
        }

        return $result;
    }

    protected function typeToString(?\\ReflectionType $type): string
    {
        return match (true) {
            $type instanceof \\ReflectionNamedType => $this->namedTypeToString($type),
            $type instanceof \\ReflectionUnionType => $this->unionTypeToString($type),
            $type instanceof \\ReflectionIntersectionType => $this->intersectionTypeToString($type),
            default => 'mixed',
        };
    }

    protected function namedTypeToString(\\ReflectionNamedType $type): string
    {
        $name = $type->getName();

        if (! $type->isBuiltin() && ! in_array($name, ['self', 'parent', 'static'])) {
            $name = '\\\\'.$name;
        }

        if ($type->allowsNull() && ! in_array($name, ['null', 'mixed', 'void'])) {
            $name = '?'.$name;
        }

        return $name;
    }

    protected function unionTypeToString(\\ReflectionUnionType $type): string
    {
        return implode('|', array_map(function (\\ReflectionType $type) {
            $result = $this->typeToString($type);

            if ($type instanceof \\ReflectionIntersectionType) {
                return "({$result})";
            }

            return $result;
        }, $type->getTypes()));
    }

    protected function intersectionTypeToString(\\ReflectionIntersectionType $type): string
    {
        return implode('&', array_map($this->typeToString(...), $type->getTypes()));
    }

    protected function defaultValueToString(\\ReflectionParameter $param): string
    {
        if ($param->isDefaultValueConstant()) {
            return '\\\\'.$param->getDefaultValueConstantName();
        }

        $value = $param->getDefaultValue();

        return match (true) {
            is_null($value) => 'null',
            is_numeric($value) => $value,
            is_bool($value) => $value ? 'true' : 'false',
            is_array($value) => '[]',
            is_object($value) => 'new \\\\'.get_class($value),
            default => "'{$value}'",
        };
    }
};

$builder = new class($docblocks) {
    public function __construct(protected $docblocks) {}

    public function methods()
    {
        $reflection = new \\ReflectionClass(\\Illuminate\\Database\\Query\\Builder::class);

        return collect($reflection->getMethods(\\ReflectionMethod::IS_PUBLIC | \\ReflectionMethod::IS_PROTECTED))
            ->filter(fn(ReflectionMethod $method) => !str_starts_with($method->getName(), "__") || (!$method->isPublic() && empty($method->getAttributes(\\Illuminate\\Database\\Eloquent\\Attributes\\Scope::class))))
            ->map(fn(\\ReflectionMethod $method) => $this->getMethodInfo($method))
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
`;
