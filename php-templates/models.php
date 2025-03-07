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
        collect(glob(base_path('**/Models/*.php')))->each(fn($file) => include_once($file));

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
            ->filter(fn($method) => $method->isPublic() && !$method->isStatic() && str_starts_with($method->name, 'scope'))
            ->map(fn($method) => str($method->name)->replace('scope', '')->lcfirst()->toString())
            ->values()
            ->toArray();

        $data['uri'] = $reflection->getFileName();

        return [
            $className => $data,
        ];
    }
};

$builder = new class($docblocks) {
    public function __construct(protected $docblocks) {}

    public function methods()
    {
        $reflection = new \ReflectionClass(\Illuminate\Database\Query\Builder::class);

        return collect($reflection->getMethods(\ReflectionMethod::IS_PUBLIC))
            ->filter(fn(ReflectionMethod $method) => !str_starts_with($method->getName(), "__"))
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
