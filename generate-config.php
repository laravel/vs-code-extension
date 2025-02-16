<?php

$items = json_decode(file_get_contents(__DIR__ . '/generatable.json'), true);
$packageJson = json_decode(file_get_contents(__DIR__ . '/package.json'), true);

$config = [];

usort($items, function($a, $b) {
    return $a['type'] <=> $b['type'];
});

foreach ($items as $item) {
    $type = $item['type'];
    $label = $item['label'] ?? $type;
    $features = $item['features'] ?? ['diagnostics', 'hover', 'link', 'completion'];

    foreach ($features as $feature) {
        $config["Laravel.{$type}.{$feature}"] = [
            'type' => 'boolean',
            'default' => true,
            'generated' => true,
            'description' => match($feature) {
                'diagnostics' => "Enable diagnostics for {$label}.",
                'hover' => "Enable hover information for {$label}.",
                'link' => "Enable linking for {$label}.",
                'completion' => "Enable completion for {$label}.",
                default => null,
            },
        ];
    }
}

$currentConfig = $packageJson['contributes']['configuration']['properties'] ?? [];

$customConfig = array_filter($currentConfig, function($value, $key) {
    return ($value['generated'] ?? false) === false;
}, ARRAY_FILTER_USE_BOTH);

$packageJson['contributes']['configuration']['properties'] = array_merge($customConfig, $config);

file_put_contents(
    __DIR__ . '/package.json',
    json_encode($packageJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL
);

$keys = array_map(function($key) {
    return str_replace('Laravel.', '', $key);
}, array_keys($config));

file_put_contents(
    __DIR__ . '/src/support/generated-config.ts',
    "export type GeneratedConfigKey = '" . implode("' | '", $keys) . "';" . PHP_EOL
);
