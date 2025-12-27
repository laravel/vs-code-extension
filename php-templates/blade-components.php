<?php

$components = new class {
    protected $autoloaded = [];

    protected $prefixes = [];

    public function __construct()
    {
        $this->autoloaded = require base_path("vendor/composer/autoload_psr4.php");
    }

    public function all()
    {
        $components = collect(array_merge(
            $this->getStandardClasses(),
            $this->getStandardViews(),
            $this->getNamespaced(),
            $this->getAnonymousNamespaced(),
            $this->getAnonymous(),
            $this->getAliases(),
            $this->getVendorComponents(),
        ))->groupBy('key')->map(fn($items) => [
            'isVendor' => $items->first()['isVendor'],
            'paths' => $items->pluck('path')->values(),
            'props' => $items->pluck('props')->unique()->values()->filter()->flatMap(fn($i) => $i),
        ]);

        return [
            'components' => $components,
            'prefixes' => $this->prefixes,
        ];
    }

    private function runConcurrently(\Illuminate\Support\Collection $items, \Closure $callback, int $concurrency = 8): array
    {
        if (app()->version() > 11 && function_exists('pcntl_fork') && \Composer\InstalledVersions::isInstalled('spatie/fork')) {
            $tasks = $items
                ->split($concurrency)
                ->map(fn (\Illuminate\Support\Collection $chunk) => fn (): array => $callback($chunk))
                ->toArray();

            $results = \Illuminate\Support\Facades\Concurrency::driver('fork')->run($tasks);

            return array_merge(...$results);
        }

        return $callback($items);
    }

    private function getComponentPropsFromDirective(string $path): array
    {
        if (!\Illuminate\Support\Facades\File::exists($path)) {
            return [];
        }

        $contents = \Illuminate\Support\Facades\File::get($path);

        $match = str($contents)->match('/\@props\(\[(.*?)\]\)/s');

        if ($match->isEmpty()) {
            return [];
        }

        $parser = (new \PhpParser\ParserFactory)->createForNewestSupportedVersion();

        $propsAsString = $match->wrap('[', ']')->toString();

        try {
            $ast = $parser->parse("<?php return {$propsAsString};");
        } catch (\Throwable $e) {
            return [];
        }

        $traverser = new \PhpParser\NodeTraverser();
        $visitor = new class extends \PhpParser\NodeVisitorAbstract {
            public array $props = [];

            private function getClassConstNodeValue(\PhpParser\Node\Expr\ClassConstFetch $node): string
            {
                return match (true) {
                    $node->name instanceof \PhpParser\Node\Identifier => "{$node->class->toString()}::{$node->name->toString()}",
                    default => $node->class->toString(),
                };
            }

            private function getConstNodeValue(\PhpParser\Node\Expr\ConstFetch $node): string
            {
                return $node->name->toString();
            }

            private function getStringNodeValue(\PhpParser\Node\Scalar\String_ $node): string
            {
                return $node->value;
            }

            private function getIntNodeValue(\PhpParser\Node\Scalar\Int_ $node): int
            {
                return $node->value;
            }

            private function getFloatNodeValue(\PhpParser\Node\Scalar\Float_ $node): float
            {
                return $node->value;
            }

            private function getNodeValue(\PhpParser\Node $node): mixed
            {
                return match (true) {
                    $node instanceof \PhpParser\Node\Expr\ConstFetch => $this->getConstNodeValue($node),
                    $node instanceof \PhpParser\Node\Expr\ClassConstFetch => $this->getClassConstNodeValue($node),
                    $node instanceof \PhpParser\Node\Scalar\String_ => $this->getStringNodeValue($node),
                    $node instanceof \PhpParser\Node\Scalar\Int_ => $this->getIntNodeValue($node),
                    $node instanceof \PhpParser\Node\Scalar\Float_ => $this->getFloatNodeValue($node),
                    $node instanceof \PhpParser\Node\Expr\Array_ => $this->getArrayNodeValue($node),
                    $node instanceof \PhpParser\Node\Expr\New_ => $this->getObjectNodeValue($node),
                    default => null
                };
            }

            private function getObjectNodeValue(\PhpParser\Node\Expr\New_ $node): array
            {
                if (! $node->class instanceof \PhpParser\Node\Stmt\Class_) {
                    return [];
                }

                $array = [];

                foreach ($node->class->getProperties() as $property) {
                    foreach ($property->props as $item) {
                        $array[$item->name->name] = $this->getNodeValue($item->default);
                    }
                }

                return array_filter($array);
            }

            private function getArrayNodeValue(\PhpParser\Node\Expr\Array_ $node): array
            {
                $array = [];
                $i = 0;

                foreach ($node->items as $item) {
                    $value = $this->getNodeValue($item->value);

                    $array[$item->key?->value ?? $i++] = $value;
                }

                return array_filter($array);
            }

            public function enterNode(\PhpParser\Node $node) {
                if (
                    $node instanceof \PhpParser\Node\Stmt\Return_
                    && $node->expr instanceof \PhpParser\Node\Expr\Array_
                ) {
                    foreach ($node->expr->items as $item) {
                        $this->props[] = match (true) {
                            $item->value instanceof \PhpParser\Node\Scalar\String_ => [
                                'name' => \Illuminate\Support\Str::kebab($item->key?->value ?? $item->value->value),
                                'type' => $item->key ? 'string' : 'mixed',
                                'hasDefault' => $item->key ? true : false,
                                'default' => $item->key ? $this->getStringNodeValue($item->value) : null,
                            ],
                            $item->value instanceof \PhpParser\Node\Expr\ConstFetch => [
                                'name' => \Illuminate\Support\Str::kebab($item->key->value),
                                'type' => $item->value->name->toString() !== 'null' ? 'boolean' : 'mixed',
                                'hasDefault' => true,
                                'default' => $this->getConstNodeValue($item->value),
                            ],
                            $item->value instanceof \PhpParser\Node\Expr\ClassConstFetch => [
                                'name' => \Illuminate\Support\Str::kebab($item->key->value),
                                'type' => $item->value->class->toString(),
                                'hasDefault' => true,
                                'default' => $this->getClassConstNodeValue($item->value),
                            ],                            
                            $item->value instanceof \PhpParser\Node\Scalar\Int_ => [
                                'name' => \Illuminate\Support\Str::kebab($item->key->value),
                                'type' => 'integer',
                                'hasDefault' => true,
                                'default' => $this->getIntNodeValue($item->value),
                            ],
                            $item->value instanceof \PhpParser\Node\Scalar\Float_ => [
                                'name' => \Illuminate\Support\Str::kebab($item->key->value),
                                'type' => 'float',
                                'hasDefault' => true,
                                'default' => $this->getFloatNodeValue($item->value),
                            ],
                            $item->value instanceof \PhpParser\Node\Expr\Array_ => [
                                'name' => \Illuminate\Support\Str::kebab($item->key->value),
                                'type' => 'array',
                                'hasDefault' => true,
                                'default' => $this->getArrayNodeValue($item->value),
                            ],
                            $item->value instanceof \PhpParser\Node\Expr\New_ => [
                                'name' => \Illuminate\Support\Str::kebab($item->key->value),
                                'type' => $item->value->class->toString(),
                                'hasDefault' => true,
                                'default' => $this->getObjectNodeValue($item->value),
                            ],
                            default => null
                        };
                    }
                }
            }
        };
        $traverser->addVisitor($visitor);
        $traverser->traverse($ast);

        return array_filter($visitor->props);
    }

    private function mapComponentPropsFromDirective(array $files): array
    {
        if (! \Composer\InstalledVersions::isInstalled('nikic/php-parser')) {
            return $files;
        }

        return $this->runConcurrently(
            collect($files), 
            fn (\Illuminate\Support\Collection $files): array => $files->map(function (array $item): array {
                $props = $this->getComponentPropsFromDirective($item['path']);
    
                if ($props !== []) {
                    $item['props'] = $props;
                }
    
                return $item;                
            })->all()
        );
    }

    protected function getStandardViews()
    {
        $path = resource_path('views/components');

        return $this->mapComponentPropsFromDirective($this->findFiles($path, 'blade.php'));
    }

    protected function findFiles($path, $extension, $keyCallback = null)
    {
        if (!is_dir($path)) {
            return [];
        }

        $files = \Symfony\Component\Finder\Finder::create()
            ->files()
            ->name("*." . $extension)
            ->in($path);
        $components = [];
        $pathRealPath = realpath($path);

        foreach ($files as $file) {
            $realPath = $file->getRealPath();

            $key = str($realPath)
                ->replace($pathRealPath, '')
                ->ltrim('/\\')
                ->replace('.' . $extension, '')
                ->replace(['/', '\\'], '.')
                ->pipe(fn($str) => $this->handleIndexComponents($str));

            $components[] = [
                "path" => LaravelVsCode::relativePath($realPath),
                "isVendor" => LaravelVsCode::isVendor($realPath),
                "key" => $keyCallback ? $keyCallback($key) : $key,
            ];
        }

        return $components;
    }

    protected function getStandardClasses()
    {
        $path = app_path('View/Components');

        $appNamespace = collect($this->autoloaded)
            ->filter(fn($paths) => in_array(app_path(), $paths))
            ->keys()
            ->first() ?? '';

        return collect($this->findFiles(
            $path,
            'php',
            fn($key) => $key->explode('.')
                ->map(fn($p) => \Illuminate\Support\Str::kebab($p))
                ->implode('.'),
        ))->map(function ($item) use ($appNamespace) {
            $class = str($item['path'])
                ->after('View/Components/')
                ->replace('.php', '')
                ->replace('/', '\\')
                ->prepend($appNamespace . 'View\\Components\\')
                ->toString();

            if (!class_exists($class)) {
                return $item;
            }

            $reflection = new \ReflectionClass($class);
            $parameters = collect($reflection->getConstructor()?->getParameters() ?? [])
                ->filter(fn($p) => $p->isPromoted())
                ->flatMap(fn($p) => [$p->getName() => $p->isOptional() ? $p->getDefaultValue() : null])
                ->all();

            $props = collect($reflection->getProperties())
                ->filter(fn($p) => $p->isPublic() && $p->getDeclaringClass()->getName() === $class)
                ->map(fn($p) => [
                    'name' => \Illuminate\Support\Str::kebab($p->getName()),
                    'type' => (string) ($p->getType() ?? 'mixed'),
                    // We need to add hasDefault, because null can be also a default value,
                    // it can't be a flag of no default
                    'hasDefault' => $p->hasDefaultValue(),
                    'default' => $p->getDefaultValue() ?? $parameters[$p->getName()] ?? null,
                ]);

            [$except, $props] = $props->partition(fn($p) => $p['name'] === 'except');

            if ($except->isNotEmpty()) {
                $except = $except->first()['default'];
                $props = $props->reject(fn($p) => in_array($p['name'], $except));
            }

            return [
                ...$item,
                'props' => $props,
            ];
        })->all();
    }

    protected function getAliases()
    {
        $components = [];

        foreach (\Illuminate\Support\Facades\Blade::getClassComponentAliases() as $key => $class) {
            if (class_exists($class)) {
                $reflection = new ReflectionClass($class);

                $components[] = [
                    "path" => LaravelVsCode::relativePath($reflection->getFileName()),
                    "isVendor" => LaravelVsCode::isVendor($reflection->getFileName()),
                    "key" =>  $key,
                ];
            }
        }

        return $components;
    }

    protected function getAnonymousNamespaced()
    {
        $components = [];

        foreach (\Illuminate\Support\Facades\Blade::getAnonymousComponentNamespaces() as $key => $dir) {
            $path = collect([$dir, resource_path('views/' . $dir)])->first(fn($p) => is_dir($p));

            if (!$path) {
                continue;
            }

            array_push(
                $components,
                ...$this->findFiles(
                    $path,
                    'blade.php',
                    fn($k) => $k->kebab()->prepend($key . "::"),
                )
            );
        }

        return $components;
    }

    protected function getAnonymous()
    {
        $components = [];

        foreach (\Illuminate\Support\Facades\Blade::getAnonymousComponentPaths() as $item) {
            array_push(
                $components,
                ...$this->findFiles(
                    $item['path'],
                    'blade.php',
                    function (\Illuminate\Support\Stringable $key) use ($item) {
                        $prefix = $item['prefix'] ? $item['prefix'] . '::' : '';
                        $key = $key->kebab();
                        $keys = [];

                        $keys[] = $key->prepend($prefix);

                        if ($item['prefix'] === 'flux') {
                            $keys[] = $key->prepend('flux:');
                        }

                        return $keys;
                    },
                )
            );

            if (!in_array($item['prefix'], $this->prefixes)) {
                $this->prefixes[] = $item['prefix'];
            }
        }

        return $this->mapComponentPropsFromDirective($components);
    }

    protected function getVendorComponents(): array
    {
        $components = [];

        /** @var \Illuminate\View\Factory $view */
        $view = \Illuminate\Support\Facades\App::make('view');

        /** @var \Illuminate\View\FileViewFinder $finder */
        $finder = $view->getFinder();

        /** @var array<string, array<int, string>> $views */
        $views = $finder->getHints();

        foreach ($views as $key => $paths) {
            foreach ($paths as $path) {
                $path .= '/components';

                if (!is_dir($path)) {
                    continue;
                }

                array_push(
                    $components,
                    ...$this->findFiles(
                        $path,
                        'blade.php',
                        fn (\Illuminate\Support\Stringable $k) => $k->kebab()->prepend($key.'::'),
                    )
                );
            }
        }

        return $this->mapComponentPropsFromDirective($components);
    }

    protected function handleIndexComponents($str)
    {
        if ($str->endsWith('.index')) {
            return $str->replaceLast('.index', '');
        }

        if (!$str->contains('.')) {
            return $str;
        }

        $parts = $str->explode('.');

        if ($parts->slice(-2)->unique()->count() === 1) {
            $parts->pop();

            return str($parts->implode('.'));
        }

        return $str;
    }

    protected function getNamespaced()
    {
        $namespaced = \Illuminate\Support\Facades\Blade::getClassComponentNamespaces();
        $components = [];

        foreach ($namespaced as $key => $classNamespace) {
            $path = $this->getNamespacePath($classNamespace);

            if (!$path) {
                continue;
            }

            array_push(
                $components,
                ...$this->findFiles(
                    $path,
                    'php',
                    fn($k) => $k->kebab()->prepend($key . "::"),
                )
            );
        }

        return $components;
    }

    protected function getNamespacePath($classNamespace)
    {
        foreach ($this->autoloaded as $ns => $paths) {
            if (!str_starts_with($classNamespace, $ns)) {
                continue;
            }

            foreach ($paths as $p) {
                $dir = str($classNamespace)
                    ->replace($ns, '')
                    ->replace('\\', '/')
                    ->prepend($p . DIRECTORY_SEPARATOR)
                    ->toString();

                if (is_dir($dir)) {
                    return $dir;
                }
            }

            return null;
        }

        return null;
    }
};

echo json_encode($components->all());
