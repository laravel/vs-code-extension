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
        ))->groupBy('key')->pipe($this->setProps(...))->map(fn($items) => [
            'isVendor' => $items->first()['isVendor'],
            'paths' => $items->pluck('path')->unique()->values(),
            'props' => $this->formatProps($items),
        ]);

        return [
            'components' => $components,
            'prefixes' => $this->prefixes,
        ];
    }

    protected function formatProps($items)
    {
        $props = $items->pluck('props');

        if ($codeBlock = $props->firstWhere(fn ($prop) => is_string($prop))) {
            return $codeBlock;
        }

        return $props->values()->filter()->flatMap(fn($i) => $i);
    }

    protected function getStandardViews()
    {
        $path = resource_path('views/components');

        return $this->findFiles($path, 'blade.php');
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

        return $components;
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

        return $components;
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

    protected function setProps($groups)
    {
        try {
            $compiler = app('blade.compiler');
        } catch (\Throwable $e) {
            return $groups;
        }

        return $groups->map(function ($group) use ($compiler) {
            return $group->transform(function ($component) use ($compiler) {
                if (isset($component['props'])) {
                    return $component;
                }

                if (!str($component['path'])->endsWith('.blade.php')) {
                    return $component;
                }

                if (! $props = $this->parseProps($compiler, $component)) {
                    return $component;
                }

                return array_merge($component, ['props' => $props]);
            });
        });
    }

    protected function parseProps($compiler, array $component): ?string
    {
        $content = file_get_contents(base_path($component['path']));

        $result = '';

        $compiler->directive('props', function ($expression) use (&$result) {
            return $result = $expression;
        });

        $compiler->compileString($content);

        if (empty($result)) {
            return null;
        }

        return '@props('.$result.')';
    }
};

echo json_encode($components->all());
