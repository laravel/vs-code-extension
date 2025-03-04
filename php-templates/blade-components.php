<?php

$components = new class {
    protected $autoloaded = [];

    public function __construct()
    {
        $this->autoloaded = require base_path("vendor/composer/autoload_psr4.php");
    }

    public function all()
    {
        return collect(array_merge(
            $this->getStandardClasses(),
            $this->getStandardViews(),
            $this->getNamespaced(),
            $this->getAnonymousNamespaced(),
            $this->getAnonymous(),
            $this->getAliases(),
        ))->groupBy('key')->map(fn($items) => [
            'isVendor' => $items->first()['isVendor'],
            'paths' => $items->pluck('path')->values(),
        ]);
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

        foreach ($files as $file) {
            $realPath = $file->getRealPath();

            $key = \Illuminate\Support\Str::of($realPath)
                ->replace(realpath($path), '')
                ->ltrim('/\\')
                ->replace('.' . $extension, '')
                ->replace(['/', '\\'], '.');

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

        return $this->findFiles(
            $path,
            'php',
            fn($key) => $key->explode('.')
                ->map(fn($p) => \Illuminate\Support\Str::kebab($p))
                ->implode('.'),
        );
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

    protected function getExtensions()
    {
        // \Illuminate\Support\Facades\Blade::getExtensions(),
        return [];
    }

    protected function getAnonymousNamespaced()
    {
        // \Illuminate\Support\Facades\Blade::getAnonymousComponentNamespaces();
        return [];
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
                    fn($key) => $key
                        ->kebab()
                        ->prepend(($item['prefix'] ?? ':') . ':')
                        ->ltrim(':')
                        ->when(true, function ($str) {
                            if ($str->endsWith('.index')) {
                                return $str->replaceLast('.index', '');
                            }

                            if (!$str->contains('.')) {
                                return $str;
                            }

                            $parts = $str->explode('.');

                            if ($parts->slice(-2)->unique()->count() === 1) {
                                $parts->pop();

                                return $str->of($parts->implode('.'));
                            }

                            return $str;
                        })
                )
            );
        }

        return $components;
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
                $dir = \Illuminate\Support\Str::of($classNamespace)
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
