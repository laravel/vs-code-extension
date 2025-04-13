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
            $this->getVendorComponents(),
        ))->groupBy('key')->map(fn($items) => [
            'isVendor' => $items->first()['isVendor'],
            'paths' => $items->pluck('path')->values(),
            'props' => $items->pluck('props')->values()->filter()->flatMap(fn($i) => $i),
        ]);

        return [
            'components' => $components,
            'prefixes' => $this->prefixes,
        ];
    }

    private function runConcurrency(array $items, \\Closure $callback, int $concurrency = 4): array
    {
        $tasks = collect($items)
            ->split($concurrency)
            ->map(fn (\\Illuminate\\Support\\Collection $chunk) => fn (): array => $callback($chunk))
            ->toArray();

        $results = \\Illuminate\\Support\\Facades\\Concurrency::driver(match (true) {
            \\Composer\\InstalledVersions::isInstalled('spatie/fork') => 'fork',
            default => 'sync',
        })->run($tasks);

        return array_merge(...$results);
    }

    private function getComponentPropsFromDirective(string $path): array
    {
        if (!\\Illuminate\\Support\\Facades\\File::exists($path)) {
            return [];
        }

        $contents = \\Illuminate\\Support\\Facades\\File::get($path);

        $propsAsString = str($contents)->match('/\\@props\\((.*?)\\)/s')->toString();

        if (empty($propsAsString)) {
            return [];
        }

        $parser = (new \\PhpParser\\ParserFactory)->createForNewestSupportedVersion();

        try {
            $ast = $parser->parse("<?php return {$propsAsString};");
        } catch (\\Throwable $e) {
            return [];
        }

        $traverser = new \\PhpParser\\NodeTraverser();
        $visitor = new class extends \\PhpParser\\NodeVisitorAbstract {
            public array $props = [];

            /**
             * @param array<int, \\PhpParser\\Node\\ArrayItem> $items
             */
            private function getItemsAsArray(array $items): array
            {
                $array = [];

                foreach ($items as $item) {
                    $value = $item->value->value;

                    if ($item->value instanceof \\PhpParser\\Node\\Expr\\Array_) {
                        $value = $this->getItemsAsArray($item->value->items);
                    }

                    $array[$item->key?->value] = $value;
                }

                return $array;
            }

            public function enterNode(\\PhpParser\\Node $node) {
                if (
                    $node instanceof \\PhpParser\\Node\\Stmt\\Return_
                    && $node->expr instanceof \\PhpParser\\Node\\Expr\\Array_
                ) {
                    foreach ($node->expr->items as $item) {
                        array_push($this->props, match (true) {
                            $item->value instanceof \\PhpParser\\Node\\Scalar\\String_ => [
                                'name' => \\Illuminate\\Support\\Str::kebab($item->key?->value ?? $item->value->value),
                                'type' => $item->key ? 'string' : 'undefined',
                                'hasDefault' => $item->key ? true : false, 
                                'default' => $item->key ? $item->value->value : null,
                            ],
                            $item->value instanceof \\PhpParser\\Node\\Expr\\ConstFetch => [
                                'name' => \\Illuminate\\Support\\Str::kebab($item->key->value),
                                'type' => $item->value->name->toString() !== "null" ? 'boolean' : null,
                                'hasDefault' => true,
                                'default' => $item->value->name->toString(),
                            ],
                            $item->value instanceof \\PhpParser\\Node\\Scalar\\Int_ => [
                                'name' => \\Illuminate\\Support\\Str::kebab($item->key->value),
                                'type' => 'integer',
                                'hasDefault' => true,
                                'default' => $item->value->value,
                            ],
                            $item->value instanceof \\PhpParser\\Node\\Expr\\Array_ => [
                                'name' => \\Illuminate\\Support\\Str::kebab($item->key->value),
                                'type' => 'array',
                                'hasDefault' => true,
                                'default' => $this->getItemsAsArray($item->value->items),
                            ],
                            default => null
                        });
                    }
                }
            }
        };
        $traverser->addVisitor($visitor);
        $traverser->traverse($ast);

        return array_filter($visitor->props);
    }

    private function mapComponentProps(\\Illuminate\\Support\\Collection $files): array
    {
        return $files->map(function (array $item): array {
            $props = $this->getComponentPropsFromDirective($item['path']);

            if ($props !== []) {
                $item = [
                    ...$item,
                    'props' => $props,
                ];
            }

            return $item;
        })->all();
    }

    protected function getStandardViews()
    {
        $path = resource_path('views/components');

        $files = $this->findFiles($path, 'blade.php');

        return \\Composer\\InstalledVersions::isInstalled('nikic/php-parser')
            ? $this->runConcurrency($files, fn (\\Illuminate\\Support\\Collection $files): array => $this->mapComponentProps($files))
            : $files;
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

            $key = str($realPath)
                ->replace($pathRealPath, '')
                ->ltrim('/\\\\')
                ->replace('.' . $extension, '')
                ->replace(['/', '\\\\'], '.')
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
                ->map(fn($p) => \\Illuminate\\Support\\Str::kebab($p))
                ->implode('.'),
        ))->map(function ($item) use ($appNamespace) {
            $class = str($item['path'])
                ->after('View/Components/')
                ->replace('.php', '')
                ->replace('/', '\\\\')
                ->prepend($appNamespace . 'View\\\\Components\\\\')
                ->toString();

            if (!class_exists($class)) {
                return $item;
            }

            $reflection = new \\ReflectionClass($class);
            $parameters = collect($reflection->getConstructor()?->getParameters() ?? [])
                ->filter(fn($p) => $p->isPromoted())
                ->flatMap(fn($p) => [$p->getName() => $p->isOptional() ? $p->getDefaultValue() : null])
                ->all();

            $props = collect($reflection->getProperties())
                ->filter(fn($p) => $p->isPublic() && $p->getDeclaringClass()->getName() === $class)
                ->map(fn($p) => [
                    'name' => \\Illuminate\\Support\\Str::kebab($p->getName()),
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
                        ->ltrim(':'),
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

        /** @var \\Illuminate\\View\\Factory $view */
        $view = \\Illuminate\\Support\\Facades\\App::make('view');

        /** @var \\Illuminate\\View\\FileViewFinder $finder */
        $finder = $view->getFinder();

        /** @var array<string, array<int, string>> $views */
        $views = $finder->getHints();

        foreach ($views as $key => $paths) {
            // First is always optional override in the resources/views folder
            $path = $paths[0] . '/components';

            if (!is_dir($path)) {
                continue;
            }

            array_push(
                $components,
                ...$this->findFiles(
                    $path,
                    'blade.php',
                    fn (\\Illuminate\\Support\\Stringable $k) => $k->kebab()->prepend($key.'::'),
                )
            );
        }

        return \\Composer\\InstalledVersions::isInstalled('nikic/php-parser')
            ? $this->runConcurrency($components, fn (\\Illuminate\\Support\\Collection $files): array => $this->mapComponentProps($files))
            : $components;
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
                $dir = str($classNamespace)
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