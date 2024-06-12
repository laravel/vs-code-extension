<?php

function vscodeCollectTranslations(string $path, string $namespace = null)
{
    return collect(glob("{$path}/**/*.{php,json}", GLOB_BRACE))->map(function ($file) use ($path, $namespace) {
        $key = pathinfo($file, PATHINFO_FILENAME);

        if ($namespace) {
            $key = "{$namespace}::{$key}";
        }

        $lang = collect(explode('/', str_replace($path, '', $file)))->filter()->first();

        $lineNumbers = collect(token_get_all(file_get_contents($file)))
            ->filter(function ($token) {
                return is_array($token) && $token[0] === T_CONSTANT_ENCAPSED_STRING;
            })
            ->flatMap(function ($token) {
                return [
                    trim($token[1], '\'"') => $token[2]
                ];
            });

        return [
            'key' => $key,
            'lang' => $lang,
            'values' => collect(__($key, [], $lang))->map(function ($value) use ($file, $lineNumbers) {
                return [
                    'value' => $value,
                    'path' => $file,
                    'line' => $lineNumbers->offsetExists($value) ? $lineNumbers[$value] : 1,
                    'params' => preg_match_all('/\:([A-Za-z0-9_]+)/', $value, $matches) ? $matches[1] : [],
                ];
            }),
        ];
    });
}

$namespaces = app('translator')->getLoader()->namespaces();
$path = app()->langPath();

$default = vscodeCollectTranslations($path);

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

        if ($value['lang'] === App::currentLocale()) {
            $final[$dotKey]['default'] = $v;
        }
    }
}

echo json_encode($final);
