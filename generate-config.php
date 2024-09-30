<?php

if (!file_exists(__DIR__ . '/previously-generated.json')) {
    file_put_contents(__DIR__ . '/previously-generated.json', json_encode([]));
}

$items = json_decode(file_get_contents(__DIR__ . '/generatable.json'), true);
$previousItems = json_decode(file_get_contents(__DIR__ . '/previously-generated.json'), true);
$packageJson = json_decode(file_get_contents(__DIR__ . '/package.json'), true);

$config = [];

usort($items, function($a, $b) {
    return $a['type'] <=> $b['type'];
});

foreach ($items as $item) {
    $type = $item['type'];
    $features = $item['features'] ?? ['diagnostics', 'hover', 'link'];

    foreach ($features as $feature) {
        $config["Laravel.{$type}.{$feature}"] = [
            'type' => 'boolean',
            'default' => true,
            'description' => match($feature) {
                'diagnostics' => "Enable diagnostics for {$type}.",
                'hover' => "Enable hover information for {$type}.",
                'link' => "Enable linking for {$type}.",
                default => null,
            },
        ];
    }
}

$currentConfig = $packageJson['contributes']['configuration']['properties'] ?? [];

$customConfig = array_filter($currentConfig, function($value, $key) use ($previousItems) {
    return !in_array($key, array_keys($previousItems));
}, ARRAY_FILTER_USE_BOTH);

$packageJson['contributes']['configuration']['properties'] = array_merge($customConfig, $config);

file_put_contents(__DIR__ . '/package.json', json_encode($packageJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

file_put_contents(__DIR__ . '/previously-generated.json', json_encode($config));

$keys = array_map(function($key) {
    return str_replace('Laravel.', '', $key);
}, array_keys($config));

file_put_contents(__DIR__ . '/src/support/generated-config.ts', "export type ConfigKey = '" . implode("' | '", $keys) . "';");
