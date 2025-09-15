<?php

$sourceFile = __DIR__ . '/src/support/phpEnvironments.ts';

if (!file_exists($sourceFile)) {
    echo "Error: Source file not found: $sourceFile\n";
    exit(1);
}

$content = file_get_contents($sourceFile);

$pattern = '/export const phpEnvironments: Record<PhpEnvironment, PhpEnvironmentConfig> = \{(.*?)\};/s';
if (!preg_match($pattern, $content, $matches)) {
    echo "Error: Could not find phpEnvironments object\n";
    exit(1);
}

$objectContent = $matches[1];

$environments = [];

$lines = explode("\n", $objectContent);
$currentEnv = null;
$currentEnvData = [];
$insideEnv = false;
$braceDepth = 0;

foreach ($lines as $line) {
    $line = trim($line);

    if (empty($line)) {
        continue;
    }

    // Check if starting a new environment
    if (preg_match('/^(\w+):\s*\{/', $line, $matches)) {
        // Save previous environment if exists
        if ($currentEnv && !empty($currentEnvData)) {
            $environments[$currentEnv] = $currentEnvData;
        }

        $currentEnv = $matches[1];
        $currentEnvData = [];
        $insideEnv = true;
        $braceDepth = 1;
        continue;
    }

    if (!$insideEnv) {
        continue;
    }

    // Count braces to handle nested objects
    $braceDepth += substr_count($line, '{') - substr_count($line, '}');

    // If we've closed all braces, we're done with this environment
    if ($braceDepth <= 0) {
        if ($currentEnv) {
            $environments[$currentEnv] = $currentEnvData;
            $currentEnv = null;
            $currentEnvData = [];
        }
        $insideEnv = false;
        continue;
    }

    // Parse property line
    if (preg_match('/^(\w+):\s*(.+?)(?:,\s*)?$/', $line, $propMatch)) {
        $propName = $propMatch[1];
        $propValue = trim($propMatch[2], ' ,');

        // Skip function properties (test function)
        if (strpos($propValue, '=>') !== false || strpos($propValue, 'function') !== false) {
            continue;
        }

        // Parse different value types
        if ($propValue === 'true') {
            $currentEnvData[$propName] = true;
        } elseif ($propValue === 'false') {
            $currentEnvData[$propName] = false;
        } elseif (preg_match('/^\[(.+)\]$/', $propValue, $arrayMatch)) {
            // Handle array values
            $arrayContent = $arrayMatch[1];
            $arrayItems = preg_split('/,\s*/', $arrayContent);
            $currentEnvData[$propName] = array_map(function($item) {
                return trim($item, '"\'');
            }, $arrayItems);
        } elseif (preg_match('/^["\'](.+)["\']$/', $propValue, $stringMatch)) {
            // Handle string values
            $currentEnvData[$propName] = $stringMatch[1];
        } else {
            // Handle other scalar values (remove trailing comma if present)
            $currentEnvData[$propName] = rtrim($propValue, ',');
        }
    }
}

// Don't forget the last environment
if ($currentEnv && !empty($currentEnvData)) {
    $environments[$currentEnv] = $currentEnvData;
}

$packageJson = json_decode(file_get_contents(__DIR__ . '/package.json'), true);

$enums = array_keys($environments);
$enumItemLabels = array_map(function($env) {
    return $env['label'];
}, array_values($environments));
$markdownEnumDescriptions = array_map(function($env) {
    return $env['description'] ?? $env['label'];
}, array_values($environments));

$packageJson['contributes']['configuration']['properties']['Laravel.phpEnvironment']['enum'] = $enums;
$packageJson['contributes']['configuration']['properties']['Laravel.phpEnvironment']['enumItemLabels'] = $enumItemLabels;
$packageJson['contributes']['configuration']['properties']['Laravel.phpEnvironment']['markdownEnumDescriptions'] = $markdownEnumDescriptions;

file_put_contents(
    __DIR__ . '/package.json',
    json_encode($packageJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL
);

exec('npm run format');
