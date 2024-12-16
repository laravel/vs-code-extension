export default `
function vsCodeTranslationValue($key, $value, $file, $lines): array
{
    $lineNumber = 1;
    $keys = explode('.', $key);
    $index = 0;
    $currentKey = array_shift($keys);

    while ($currentKey !== null && $index < count($lines)) {
        $line = $lines[$index][1];

        if (strpos($line, '"' . $currentKey . '"', 0) !== false || strpos($line, "'" . $currentKey . "'", 0) !== false) {
            $lineNumber = $lines[$index][0];
            $currentKey = array_shift($keys);
        }

        $index++;
    }

    return [
        'value' => $value,
        'path' => realpath($file),
        'line' => $lineNumber,
        'params' => preg_match_all('/\\:([A-Za-z0-9_]+)/', $value, $matches) ? $matches[1] : [],
    ];
}

function vscodeCollectTranslations(string $path, string $namespace = null)
{
    return collect(glob("{$path}/**/*.{php,json}", GLOB_BRACE))->map(function ($file) use ($path, $namespace) {
        $key = pathinfo($file, PATHINFO_FILENAME);

        if ($namespace) {
            $key = "{$namespace}::{$key}";
        }

        $lang = collect(explode('/', str_replace($path, '', $file)))->filter()->first();

        $fileLines = explode(PHP_EOL, file_get_contents($file));
        $lines = [];
        $inComment = false;

        foreach ($fileLines as $index => $line) {
            $trimmed = trim($line);

            if (substr($trimmed, 0, 2) === '/*') {
                $inComment = true;
                continue;
            }

            if ($inComment) {
                if (substr($trimmed, -2) !== '*/') {
                    continue;
                }

                $inComment = false;
            }

            if (substr($trimmed, 0, 2) === '//') {
                continue;
            }

            $lines[] = [$index + 1, $trimmed];
        }

        return [
            'key' => $key,
            'lang' => $lang,
            'values' => collect(\\Illuminate\\Support\\Arr::dot(__($key, [], $lang)))->map(function ($value, $key) use ($file, $lines) {
                if (is_array($value)) {
                    return null;
                }

                return vsCodeTranslationValue($key, $value, $file, $lines);
            })->filter(),
        ];
    });
}

$loader = app("translator")->getLoader();
$namespaces = $loader->namespaces();

$reflection = new ReflectionClass($loader);
$property = $reflection->hasProperty("paths")
  ? $reflection->getProperty("paths")
  : $reflection->getProperty("path");
$property->setAccessible(true);

$paths = \\Illuminate\\Support\\Arr::wrap($property->getValue($loader));

$default = collect($paths)->flatMap(function ($path) {
  return vscodeCollectTranslations($path);
});

$namespaced = collect($namespaces)->flatMap(function ($path, $namespace) {
    return vscodeCollectTranslations($path, $namespace);
});

$final = [];

foreach ($default->merge($namespaced) as $value) {
    foreach ($value['values'] as $key => $v) {
        $dotKey = "{$value['key']}.{$key}";

        if (!isset($final[$dotKey])) {
            $final[$dotKey] = [];
        }

        $final[$dotKey][$value['lang']] = $v;

        if ($value['lang'] === \\Illuminate\\Support\\Facades\\App::currentLocale()) {
            $final[$dotKey]['default'] = $v;
        }
    }
}

echo json_encode($final);
`;
