<?php

class LaravelVsCode
{
    public static function relativePath($path)
    {
        if (!str_contains($path, base_path())) {
            return (string) $path;
        }

        return ltrim(str_replace(base_path(), '', realpath($path) ?: $path), DIRECTORY_SEPARATOR);
    }

    public static function isVendor($path)
    {
        return str_contains($path, base_path("vendor"));
    }

    public static function outputMarker($key)
    {
        return '__VSCODE_LARAVEL_' . $key . '__';
    }

    public static function startupError(\Throwable $e)
    {
        throw new Error(self::outputMarker('STARTUP_ERROR') . ': ' . $e->getMessage());
    }
}

$components = new class {
    public function all(): array
    {
        $components = collect(array_merge(
            $this->getStandardClasses(),
            $this->getStandardViews()
        ))->groupBy('key')->map(fn($items) => [
            'isVendor' => $items->first()['isVendor'],
            'paths' => $items->pluck('path')->values(),
            'props' => $items->pluck('props')->values()->filter()->flatMap(fn($i) => $i),
        ]);

        return [
            'components' => $components
        ];
    }

    /**
     * @return array<int, array{path: string, isVendor: string, key: string}>
     */
    protected function findFiles(string $path, string $extension, \Closure $keyCallback): array
    {
        if (! is_dir($path)) {
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
                ->pipe(fn(string $str): string => $str);

            $components[] = [
                "path" => LaravelVsCode::relativePath($realPath),
                "isVendor" => LaravelVsCode::isVendor($realPath),
                "key" => $keyCallback ? $keyCallback($key) : $key,
            ];
        }

        return $components;
    }

    protected function getStandardClasses(): array
    {
        /** @var string|null $classNamespace */
        $classNamespace = config('livewire.class_namespace');

        if (! $classNamespace) {
            return [];
        }

        $path = str($classNamespace)
            ->replace('\\', DIRECTORY_SEPARATOR)
            ->replace('App', 'app')
            ->toString();

        $items = $this->findFiles(
            $path,
            'php',
            fn(\Illuminate\Support\Stringable $key): string => $key->explode('.')
                ->map(fn(string $p): string => \Illuminate\Support\Str::kebab($p))
                ->implode('.'),
        );

        return collect($items)
            ->map(function ($item) {
                $class = str($item['path'])
                ->replace('.php', '')
                ->replace('/', '\\')
                ->ucfirst()
                ->toString();

                if (! class_exists($class)) {
                    return null;
                }

                $reflection = new \ReflectionClass($class);

                if (! $reflection->isSubclassOf('Livewire\Component')) {
                    return null;
                }

                return [
                    ...$item,
                    'props' => $this->getComponentProps($reflection),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    protected function getStandardViews(): array
    {
        /** @var string|null $viewPath */
        $path = config('livewire.view_path');

        if (! $path) {
            return [];
        }

        $items = $this->findFiles(
            $path,
            'blade.php',
            fn(\Illuminate\Support\Stringable $key): string => $key->explode('.')
                ->map(fn(string $p): string => \Illuminate\Support\Str::kebab($p))
                ->implode('.'),
        );

        $previousClass = null;

        return collect($items)
            ->map(function ($item) use (&$previousClass) {
                // This is ugly, I know, but I don't have better idea how to get
                // anonymous classes from Volt components
                ob_start();

                try {
                    require_once $item['path'];
                } catch (\Throwable $e) {
                    return $item;
                }

                ob_clean();

                $declaredClasses = get_declared_classes();
                $class = end($declaredClasses);

                if ($previousClass === $class) {
                    return $item;
                }

                $previousClass = $class;

                if (! \Illuminate\Support\Str::contains($class, '@anonymous')) {
                    return $item;
                }

                $reflection = new \ReflectionClass($class);

                if (! $reflection->isSubclassOf('Livewire\Volt\Component')) {
                    return $item;
                }

                return [
                    ...$item,
                    'props' => $this->getComponentProps($reflection),
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{name: string, type: string, default: mixed}>
     */
    protected function getComponentProps(ReflectionClass $reflection): array
    {
        $props = collect();

        // Firstly we need to get the mount method parameters. Remember that
        // Livewire components can have multiple mount methods in traits.

        $methods = $reflection->getMethods();

        $mountMethods = array_filter(
            $methods,
            fn (\ReflectionMethod $method): bool => strpos($method->getName(), 'mount') === 0
        );

        foreach ($mountMethods as $method) {
            $parameters = $method->getParameters();

            $parameters = collect($parameters)
                ->map(fn(\ReflectionParameter $p) => [
                    'name' => \Illuminate\Support\Str::kebab($p->getName()),
                    'type' => (string) ($p->getType() ?? 'mixed'),
                    'default' => $p->isOptional() ? $p->getDefaultValue() : null
                ])
                ->all();

            $props = $props->merge($parameters);
        }

        // Then we need to get the public properties

        $properties = collect($reflection->getProperties())
            ->filter(fn(\ReflectionProperty $p) => $p->isPublic() && $p->getDeclaringClass()->getName() === $reflection->getName())
            ->map(fn(\ReflectionProperty $p) => [
                'name' => \Illuminate\Support\Str::kebab($p->getName()),
                'type' => (string) ($p->getType() ?? 'mixed'),
                'default' => $p->getDefaultValue()
            ])
            ->all();

        return $props
            ->merge($properties)
            ->unique('name') // Mount parameters always overwrite public properties
            ->all();
    }
};

echo json_encode($components->all());
