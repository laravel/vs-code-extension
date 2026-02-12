<?php

use Illuminate\Support\Facades\File;
use Pest\Contracts\HasPrintableTestCaseName;
use Pest\Support\Str as PestStr;
use Pest\TestSuite;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use PHPUnit\Runner\TestSuiteLoader;
use PHPUnit\TextUI\XmlConfiguration\LoadedFromFileConfiguration;
use PHPUnit\TextUI\XmlConfiguration\Loader as XmlConfigurationLoader;
use SebastianBergmann\FileIterator\Facade as FileIterator;

$tests = new class {
    public function all(): array
    {
        if ($this->isPestInstalled()) {
            $this->bootPest();
        }

        return collect(
            $this->getTestSuites()
        )->map(fn ($suite) => [
            'name' => $suite['name'],
            'files' => collect(array_merge(
                $this->collectPhpUnitTests($suite['files']),
                $this->collectPestTests($suite['files']),
            ))->map($this->pathsTransformer($suite['directories'])),
        ])->all();
    }

    protected function pathsTransformer(array $directories): callable
    {
        $directories = array_map(LaravelVsCode::relativePath(...), $directories);

        return function (array $file) use ($directories) {
            return array_merge($file, [
                'path' => $path = LaravelVsCode::relativePath($file['path']),
                'name' => str($path)->basename()->replace('.php', ''),
                'directories' => str($path)->dirname()
                    ->replace($directories, '')
                    ->ltrim(DIRECTORY_SEPARATOR)
                    ->explode(DIRECTORY_SEPARATOR)
                    ->filter(),
            ]);
        };
    }

    protected function isPestInstalled(): bool
    {
        return class_exists(TestSuite::class);
    }

    protected function bootPest(): void
    {
        require_once base_path('vendor/pestphp/pest/overrides/Runner/TestSuiteLoader.php');

        TestSuite::getInstance(base_path(), 'tests');
    }

    /**
     * @return array<int, array{name: string, directories: array<int, string>, files: array<int, string>}>
     */
    protected function getTestSuites(): array
    {
        if (is_null($config = $this->loadConfig())) {
            return [[
                'name' => 'default',
                'directories' => [base_path('tests')],
                'files' => $this->findTestFiles(base_path('tests')),
            ]];
        }

        $result = [];

        foreach ($config->testSuite() as $suite) {
            $files = collect();

            foreach ($suite->directories() as $directory) {
                $files->push(...$this->findTestFiles($directory->path()));
            }

            foreach ($suite->files() as $file) {
                $files->push($file->path());
            }

            $result[] = [
                'name' => $suite->name(),
                'directories' => collect($suite->directories()->asArray())->map->path()->all(),
                'files' => $files->all(),
            ];
        }

        return $result;
    }

    protected function loadConfig(): ?LoadedFromFileConfiguration
    {
        foreach ([
            base_path('phpunit.xml'),
            base_path('phpunit.xml.dist'),
        ] as $path) {
            if (File::exists($path)) {
                return (new XmlConfigurationLoader)->load($path);
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    protected function findTestFiles(string $directory): array
    {
        return (new FileIterator)->getFilesAsArray($directory, 'Test.php');
    }

    /**
     * @param  array<int, string>  $files
     * @return array{path:string, tests: array<int, array{name: string, line: int}>}
     */
    protected function collectPestTests(array $files): array
    {
        if (is_null($pest = TestSuite::getInstance())) {
            return [];
        }

        $results = [];

        foreach ($files as $path) {
            if (is_null($factory = $pest->tests->get($path))) {
                continue;
            }

            $results[] = [
                'path' => $path,
                'tests' => collect($factory->methods)
                    ->whereNotNull('description')
                    ->map(fn ($method) => [
                        'name' => $method->description,
                        'eventName' => PestStr::evaluable($method->description),
                        'line' => (new ReflectionFunction($method->closure))->getStartLine(),
                    ])
                    ->values()
                    ->all(),
            ];
        }

        return $results;
    }

    /**
     * @param  array<int, string>  $files
     * @return array{path:string, tests: array<int, array{name: string, line: int}>}
     */
    protected function collectPhpUnitTests(array $files): array
    {
        $loader = new TestSuiteLoader;

        $results = [];

        foreach ($files as $path) {
            try {
                $reflection = $loader->load($path);
            } catch (Throwable $e) {
                continue;
            }

            if (! $this->isPhpUnitTest($reflection)) {
                continue;
            }

            $tests = $this->extractTestMethods($reflection);

            if (! empty($tests)) {
                $results[] = compact('path', 'tests');
            }
        }

        return $results;
    }

    protected function isPhpUnitTest(ReflectionClass $reflection): bool
    {
        return $reflection->isSubclassOf(TestCase::class)
            && ! $reflection->implementsInterface(HasPrintableTestCaseName::class);
    }

    /**
     * @param  ReflectionClass<TestCase>  $reflection
     * @return array<int, array{name: string, line: int}>
     */
    protected function extractTestMethods(ReflectionClass $reflection): array
    {
        $tests = [];

        foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            if ($method->getDeclaringClass()->getName() !== $reflection->getName()) {
                continue;
            }

            if (! $this->isTestMethod($method)) {
                continue;
            }

            $tests[] = [
                'name' => $name = $method->getName(),
                'eventName' => $name,
                'line' => $method->getStartLine(),
            ];
        }

        return $tests;
    }

    protected function isTestMethod(ReflectionMethod $method): bool
    {
        return str_starts_with($method->getName(), 'test')
            || $method->getAttributes(Test::class) !== [];
    }
};

echo json_encode($tests->all());
