// This file was generated from php-templates/translations.php, do not edit directly
export default `
$translator = new class
{
    public $paths = [];

    public $values = [];

    public $paramResults = [];

    public $params = [];

    public $emptyParams = [];

    public function all()
    {
        $final = [];

        foreach ($this->retrieve() as $value) {
            if ($value instanceof \\Illuminate\\Support\\LazyCollection) {
                foreach ($value as $val) {
                    $dotKey = $val["k"];
                    $final[$dotKey] ??= [];

                    $final[$dotKey][$val["la"]] = $val["vs"];
                }
            } else {
                foreach ($value["vs"] as $v) {
                    $dotKey = "{$value["k"]}.{$v['k']}";
                    $final[$dotKey] ??= [];

                    $final[$dotKey][$value["la"]] = $v['arr'];
                }
            }
        }

        return $final;
    }

    protected function retrieve()
    {
        $loader = app("translator")->getLoader();
        $namespaces = $loader->namespaces();

        $paths = $this->getPaths($loader);

        $default = collect($paths)->flatMap(
            fn($path) => $this->collectFromPath($path)
        );

        $namespaced = collect($namespaces)->flatMap(
            fn($path, $namespace) => $this->collectFromPath($path, $namespace)
        );

        return $default->merge($namespaced);
    }

    protected function getPaths($loader)
    {
        $reflection = new ReflectionClass($loader);
        $property = null;

        if ($reflection->hasProperty("paths")) {
            $property = $reflection->getProperty("paths");
        } else if ($reflection->hasProperty("path")) {
            $property = $reflection->getProperty("path");
        }

        if ($property !== null) {
            $property->setAccessible(true);
            return \\Illuminate\\Support\\Arr::wrap($property->getValue($loader));
        }

        return [];
    }

    public function collectFromPath(string $path, ?string $namespace = null)
    {
        $realPath = realpath($path);

        if (!is_dir($realPath)) {
            return [];
        }

        return array_map(
            fn($file) => $this->fromFile($file, $path, $namespace),
            \\Illuminate\\Support\\Facades\\File::allFiles($realPath),
        );
    }

    protected function fromFile($file, $path, $namespace)
    {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
            return $this->fromJsonFile($file, $path, $namespace);
        }

        return $this->fromPhpFile($file, $path, $namespace);
    }

    protected function linesFromJsonFile($file)
    {
        $contents = file_get_contents($file);

        try {
            $json = json_decode($contents, true) ?? [];
        } catch (\\Throwable $e) {
            return [[], []];
        }

        if (count($json) === 0) {
            return [[], []];
        }

        $lines = explode(PHP_EOL, $contents);
        $encoded = array_map(
            fn($k) => [json_encode($k), $k],
            array_keys($json),
        );
        $result = [];
        $searchRange = 2;

        foreach ($encoded as $index => $keys) {
            // Pretty likely to be on the line that is the index, go happy path first
            if (strpos($lines[$index + 1] ?? '', $keys[0]) !== false) {
                $result[$keys[1]] = $index + 2;
                continue;
            }

            // Search around the index, like to be within 2 lines
            $start = max(0, $index - $searchRange);
            $end = min($index + $searchRange, count($lines) - 1);
            $current = $start;

            while ($current <= $end) {
                if (strpos($lines[$current], $keys[0]) !== false) {
                    $result[$keys[1]] = $current + 1;
                    break;
                }

                $current++;
            }
        }

        return [$json, $result];
    }

    protected function linesFromPhpFile($file)
    {
        $tokens = token_get_all(file_get_contents($file));
        $found = [];

        $inArrayKey = true;
        $arrayDepth = -1;
        $depthKeys = [];

        foreach ($tokens as $token) {
            if (!is_array($token)) {
                if ($token === '[') {
                    $inArrayKey = true;
                    $arrayDepth++;
                }

                if ($token === ']') {
                    $inArrayKey = true;
                    $arrayDepth--;
                    array_pop($depthKeys);
                }

                continue;
            }

            if ($token[0] === T_DOUBLE_ARROW) {
                $inArrayKey = false;
            }

            if ($inArrayKey && $token[0] === T_CONSTANT_ENCAPSED_STRING) {
                $depthKeys[$arrayDepth] = trim($token[1], '"\\'');

                \\Illuminate\\Support\\Arr::set($found, implode('.', $depthKeys), $token[2]);
            }

            if (!$inArrayKey && $token[0] === T_CONSTANT_ENCAPSED_STRING) {
                $inArrayKey = true;
            }
        }

        return \\Illuminate\\Support\\Arr::dot($found);
    }

    protected function getDotted($key, $lang)
    {
        try {
            return \\Illuminate\\Support\\Arr::dot(
                \\Illuminate\\Support\\Arr::wrap(
                    __($key, [], $lang),
                ),
            );
        } catch (\\Throwable $e) {
            // Most likely, in this case, the lang file doesn't return an array
            return [];
        }
    }

    protected function getPathIndex($file)
    {
        $path = LaravelVsCode::relativePath($file);

        $index = $this->paths[$path] ?? null;

        if ($index !== null) {
            return $index;
        }

        $this->paths[$path] = count($this->paths);

        return $this->paths[$path];
    }

    protected function getValueIndex($value)
    {
        $index = $this->values[$value] ?? null;

        if ($index !== null) {
            return $index;
        }

        $this->values[$value] = count($this->values);

        return $this->values[$value];
    }

    protected function getParamIndex($key)
    {
        $processed = $this->params[$key] ?? null;

        if ($processed) {
            return $processed[0];
        }

        if (in_array($key, $this->emptyParams)) {
            return null;
        }

        $params = preg_match_all("/\\:([A-Za-z0-9_]+)/", $key, $matches)
            ? $matches[1]
            : [];

        if (count($params) === 0) {
            $this->emptyParams[] = $key;

            return null;
        }

        $paramKey = json_encode($params);

        $paramIndex = $this->paramResults[$paramKey] ?? null;

        if ($paramIndex !== null) {
            $this->params[$key] = [$paramIndex, $params];

            return $paramIndex;
        }

        $paramIndex = count($this->paramResults);

        $this->paramResults[$paramKey] = $paramIndex;

        $this->params[$key] = [$paramIndex, $params];

        return $paramIndex;
    }

    protected function fromJsonFile($file, $path, $namespace)
    {
        $lang = pathinfo($file, PATHINFO_FILENAME);

        $relativePath = $this->getPathIndex($file);

        $lines = \\Illuminate\\Support\\Facades\\File::lines($file);

        return \\Illuminate\\Support\\LazyCollection::make(function () use ($file, $lang, $relativePath, $lines) {
            [$json, $lines] = $this->linesFromJsonFile($file);

            foreach ($json as $key => $value) {
                yield [
                    "k" => $key,
                    "la" => $lang,
                    "vs" => [
                        $this->getValueIndex($value),
                        $relativePath,
                        $lines[$key] ?? null,
                        $this->getParamIndex($key),
                    ],
                ];
            }
        });
    }

    protected function fromPhpFile($file, $path, $namespace)
    {
        $key = pathinfo($file, PATHINFO_FILENAME);

        if ($namespace) {
            $key = "{$namespace}::{$key}";
        }

        $lang = collect(explode(DIRECTORY_SEPARATOR, str_replace($path, "", $file)))
            ->filter()
            ->slice(-2, 1)
            ->first();

        $relativePath = $this->getPathIndex($file);
        $lines = $this->linesFromPhpFile($file);

        return [
            "k" => $key,
            "la" => $lang,
            "vs" => \\Illuminate\\Support\\LazyCollection::make(function () use ($key, $lang, $relativePath, $lines) {
                foreach ($this->getDotted($key, [], $lang) as $key => $value) {
                    if (!array_key_exists($key, $lines) || is_array($value)) {
                        continue;
                    }

                    yield [
                        'k' => $key,
                        'arr' => [
                            $this->getValueIndex($value),
                            $relativePath,
                            $lines[$key],
                            $this->getParamIndex($value),
                        ],
                    ];
                }
            }),
        ];
    }
};

echo json_encode([
    'default' => \\Illuminate\\Support\\Facades\\App::currentLocale(),
    'translations' => $translator->all(),
    'paths' => array_keys($translator->paths),
    'values' => array_keys($translator->values),
    'params' => array_map(fn($p) => json_decode($p, true), array_keys($translator->paramResults)),
]);
`;