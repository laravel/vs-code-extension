// This file was generated from php-templates/views.php, do not edit directly
export default `
use Illuminate\\Support\\Facades\\File;
use Illuminate\\Support\\Stringable;

$blade = new class {
    public function getAllViews()
    {
        $finder = app("view")->getFinder();

        $paths = collect($finder->getPaths())->flatMap(fn($path) => $this->findViews($path));

        $hints = collect($finder->getHints())->flatMap(
            fn($paths, $key) => collect($paths)->flatMap(
                fn($path) => collect($this->findViews($path))->map(
                    fn($value) => array_merge($value, ["key" => "{$key}::{$value["key"]}"])
                )
            )
        );

        [$local, $vendor] = $paths
            ->merge($hints)
            ->map(function (array $data) {
                /** @var array{path: string, key: Stringable|string} $data */
                $path = $data["path"];
                $key = $data["key"] instanceof Stringable ? $data["key"]->toString() : $data["key"];

                $data["isLivewire"] = $this->isLivewire($path, $key);
                $data["isMfc"] = $data["isLivewire"] && $this->isMfc($path);

                return $data;
            })
            ->values()
            ->partition(fn($v) => !$v["isVendor"]);

        return $local
            ->sortBy("key", SORT_NATURAL)
            ->merge($vendor->sortBy("key", SORT_NATURAL));
    }

    public function getAllComponents()
    {
        $namespaced = \\Illuminate\\Support\\Facades\\Blade::getClassComponentNamespaces();
        $autoloaded = require base_path("vendor/composer/autoload_psr4.php");
        $components = [];

        foreach ($namespaced as $key => $ns) {
            $path = null;

            foreach ($autoloaded as $namespace => $paths) {
                if (str_starts_with($ns, $namespace)) {
                    foreach ($paths as $p) {
                        $test = str($ns)->replace($namespace, '')->replace('\\\\', '/')->prepend($p . DIRECTORY_SEPARATOR)->toString();

                        if (is_dir($test)) {
                            $path = $test;
                            break;
                        }
                    }

                    break;
                }
            }

            if (!$path) {
                continue;
            }

            $files = \\Symfony\\Component\\Finder\\Finder::create()
                ->files()
                ->name("*.php")
                ->in($path);

            foreach ($files as $file) {
                $realPath = $file->getRealPath();
                $path = str_replace(base_path(DIRECTORY_SEPARATOR), '', $realPath);
                $key = str($realPath)
                    ->replace(realpath($path), "")
                    ->replace(".php", "")
                    ->ltrim(DIRECTORY_SEPARATOR)
                    ->replace(DIRECTORY_SEPARATOR, ".")
                    ->kebab()
                    ->prepend($key . "::");
                $isLivewire = $this->isLivewire($path, $key->toString());

                $components[] = [
                    "path" => $path,
                    "isLivewire" => $isLivewire,
                    "isMfc" => $isLivewire && $this->isMfc($path),
                    "isVendor" => str_contains($realPath, base_path("vendor")),
                    "key" =>  $key,
                ];
            }
        }

        return $components;
    }

    protected function isMfc(string $path): bool
    {
        $directoryPath = base_path(dirname($path));

        $folderName = str(basename($directoryPath))
            ->replace("⚡", "")
            ->toString();
        $fileName = str(basename($path))
            ->replace("⚡", "")
            ->before(".")
            ->toString();

        if ($folderName !== $fileName) {
            return false;
        }

        $componentPath = $directoryPath . '/' . $fileName . '.php';

        return File::exists($componentPath);
    }

    protected function isLivewire(string $path, string $key): bool
    {
        if (str_contains($key, "::")) {
            /** @var array<int, string> */
            $componentNamespaces = array_keys(config("livewire.component_namespaces", []));

            [$prefix,] = explode("::", $key);

            if (in_array($prefix, $componentNamespaces)) {
                return true;
            }
        }

        /** @var array<int, string> */
        $componentLocations = array_map(
            fn (string $path) => LaravelVsCode::relativePath($path),
            config("livewire.component_locations", [])
        );

        foreach ($componentLocations as $componentLocation) {
            if (str_starts_with($path, $componentLocation)) {
                return true;
            }
        }

        return false;
    }

    protected function findViews($path)
    {
        $paths = [];

        if (!is_dir($path)) {
            return $paths;
        }

        $finder = app("view")->getFinder();
        $extensions = array_map(fn($extension) => ".{$extension}", $finder->getExtensions());

        $files = \\Symfony\\Component\\Finder\\Finder::create()
            ->files()
            ->name(array_map(fn ($ext) => "*{$ext}", $extensions))
            ->in($path);

        foreach ($files as $file) {
            $paths[] = [
                "path" => str_replace(base_path(DIRECTORY_SEPARATOR), '', $file->getRealPath()),
                "isVendor" => str_contains($file->getRealPath(), base_path("vendor")),
                "key" => str($file->getRealPath())
                    ->replace(realpath($path), "")
                    ->replace($extensions, "")
                    ->ltrim(DIRECTORY_SEPARATOR)
                    ->replace(DIRECTORY_SEPARATOR, ".")
            ];
        }

        return $paths;
    }
};

echo json_encode($blade->getAllViews()->merge($blade->getAllComponents()));
`;
