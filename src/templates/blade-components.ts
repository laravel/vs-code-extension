// This file was generated from php-templates/blade-components.php, do not edit directly
export default `
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
        ))->groupBy('key')->map(fn($items) => [
            'isVendor' => $items->first()['isVendor'],
            'paths' => $items->pluck('path')->values(),
        ]);

        return [
            'components' => $components,
            'prefixes' => $this->prefixes,
        ];
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

        $files = \\Symfony\\Component\\Finder\\Finder::create()
            ->files()
            ->name("*." . $extension)
            ->in($path);
        $components = [];
        $pathRealPath = realpath($path);

        foreach ($files as $file) {
            $realPath = $file->getRealPath();

            $key = \\Illuminate\\Support\\Str::of($realPath)
                ->replace($pathRealPath, '')
                ->ltrim('/\\\\')
                ->replace('.' . $extension, '')
                ->replace(['/', '\\\\'], '.');

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
                ->map(fn($p) => \\Illuminate\\Support\\Str::kebab($p))
                ->implode('.'),
        );
    }

    protected function getAliases()
    {
        $components = [];

        foreach (\\Illuminate\\Support\\Facades\\Blade::getClassComponentAliases() as $key => $class) {
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

        foreach (\\Illuminate\\Support\\Facades\\Blade::getAnonymousComponentNamespaces() as $key => $dir) {
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

        foreach (\\Illuminate\\Support\\Facades\\Blade::getAnonymousComponentPaths() as $item) {
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

            if (!in_array($item['prefix'], $this->prefixes)) {
                $this->prefixes[] = $item['prefix'];
            }
        }

        return $components;
    }

    protected function getNamespaced()
    {
        $namespaced = \\Illuminate\\Support\\Facades\\Blade::getClassComponentNamespaces();
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
                $dir = \\Illuminate\\Support\\Str::of($classNamespace)
                    ->replace($ns, '')
                    ->replace('\\\\', '/')
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
`;