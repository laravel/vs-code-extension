<?php

function vsCodeGetJsonTranslationsFromFile($lang, $key, $value, $file, $lines)
{
    return [
        "k" => $key,
        "la" => $lang,
        "vs" => collect(\Illuminate\Support\Arr::dot((\Illuminate\Support\Arr::wrap(__($key, [], $lang)))))
            ->map(
                fn($value, $k) => vsCodeTranslationValue(
                    $key,
                    $value,
                    $file,
                    $lines
                )
            )
            ->filter()
    ];
}

function vsCodeGetTranslationsFromFile($file, $path, $namespace)
{
    $fileLines = \Illuminate\Support\Facades\File::lines($file);
    $lines = [];
    $inComment = false;

    foreach ($fileLines as $index => $line) {
        $trimmed = trim($line);

        if (substr($trimmed, 0, 2) === "/*") {
            $inComment = true;
            continue;
        }

        if ($inComment) {
            if (substr($trimmed, -2) !== "*/") {
                continue;
            }

            $inComment = false;
        }

        if (substr($trimmed, 0, 2) === "//") {
            continue;
        }

        $lines[] = [$index + 1, $trimmed];
    }

    if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
        $lang = pathinfo($file, PATHINFO_FILENAME);

        return collect(json_decode(file_get_contents($file)))->map(
            fn($value, $key) => vsCodeGetJsonTranslationsFromFile(
                $lang,
                $key,
                $value,
                vsCodeToRelativePath($file),
                $lines,
            ),
        );
    }

    $key = pathinfo($file, PATHINFO_FILENAME);

    if ($namespace) {
        $key = "{$namespace}::{$key}";
    }

    $lang = collect(explode(DIRECTORY_SEPARATOR, str_replace($path, "", $file)))
        ->filter()
        ->slice(-2, 1)
        ->first();

    return [
        "k" => $key,
        "la" => $lang,
        "vs" => collect(\Illuminate\Support\Arr::dot((\Illuminate\Support\Arr::wrap(__($key, [], $lang)))))
            ->map(
                fn($value, $key) => vsCodeTranslationValue(
                    $key,
                    $value,
                    vsCodeToRelativePath($file),
                    $lines
                )
            )
            ->filter()
    ];
}

function vsCodeTranslationValue($key, $value, $file, $lines): ?array
{
    $isJson = pathinfo($file, PATHINFO_EXTENSION) === 'json';

    if (is_array($value)) {
        return null;
    }

    $lineNumber = 1;
    $keys = $isJson ? [$key] : explode(".", $key);
    $currentKey = array_shift($keys);

    foreach ($lines as $line) {
        if (
            strpos($line[1], '"' . $currentKey . '"', 0) !== false ||
            strpos($line[1], "'" . $currentKey . "'", 0) !== false
        ) {
            $lineNumber = $line[0];
            $currentKey = array_shift($keys);
        }

        if ($currentKey === null) {
            break;
        }
    }

    return [
        "v" => $value,
        "f" => $currentKey === null,
        "p" => $file,
        "li" => $lineNumber,
        "pa" => preg_match_all("/\:([A-Za-z0-9_]+)/", $value, $matches)
            ? $matches[1]
            : []
    ];
}

function vscodeCollectTranslations(string $path, ?string $namespace = null)
{
    $realPath = realpath($path);

    if (!is_dir($realPath)) {
        return collect();
    }

    return collect(\Illuminate\Support\Facades\File::allFiles($realPath))->map(
        fn($file) => vsCodeGetTranslationsFromFile($file, $path, $namespace)
    );
}


$loader = app("translator")->getLoader();
$namespaces = $loader->namespaces();

$reflection = new ReflectionClass($loader);
$property = null;

if ($reflection->hasProperty("paths")) {
    $property = $reflection->getProperty("paths");
} else if ($reflection->hasProperty("path")) {
    $property = $reflection->getProperty("path");
}

if ($property !== null) {
    $property->setAccessible(true);
    $paths = \Illuminate\Support\Arr::wrap($property->getValue($loader));
} else {
    $paths = [];
}

$default = collect($paths)->flatMap(
    fn($path) => vscodeCollectTranslations($path)
);

$namespaced = collect($namespaces)->flatMap(
    fn($path, $namespace) => vscodeCollectTranslations($path, $namespace)
);

$final = [];

foreach ($default->merge($namespaced) as $value) {
    if ($value instanceof \Illuminate\Support\Collection) {
        foreach ($value as $val) {
            foreach ($val["vs"] as $key => $v) {
                $dotKey = $val["k"];

                if (!isset($final[$dotKey])) {
                    $final[$dotKey] = [];
                }

                $foundFullKey = \Illuminate\Support\Arr::pull($v, "f");
                $final[$dotKey][$val["la"]] = $v;
            }
        }
    } else {
        foreach ($value["vs"] as $key => $v) {
            $dotKey = "{$value["k"]}.{$key}";
            $final[$dotKey] ??= [];

            $foundFullKey = \Illuminate\Support\Arr::pull($v, "f");

            if ($foundFullKey) {
              $final[$dotKey][$value["la"]] = $v;
            } else {
              $final[$dotKey][$value["la"]] ??= $v;
            }
        }
    }
}

echo json_encode([
    'default' => \Illuminate\Support\Facades\App::currentLocale(),
    'translations' => $final,
]);
