<?php

$templates = glob('php-templates/*.php');

foreach ($templates as $template) {
    $content = file_get_contents($template);

    $content = str_replace('\\', '\\\\', $content);
    $content = str_replace('<?php', '', $content);
    $content = implode("\n", [
        "// This file was generated from {$template}, do not edit directly",
        'export default `',
        trim($content),
        '`;'
    ]);

    file_put_contents(__DIR__ . '/src/templates/' . pathinfo($template, PATHINFO_FILENAME) . '.ts', $content);
}

if (!isset($building)) {
    exec('npm run format');
}
