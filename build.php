<?php

$building = true;

echo 'Generating templates...' . PHP_EOL;
require 'generate-templates.php';

echo 'Generating config...' . PHP_EOL;
require 'generate-config.php';

echo 'Generating PHP environments...' . PHP_EOL;
require 'generate-php-envs.php';

echo 'Generating registered commands...' . PHP_EOL;
require 'generate-registered-commands.php';

echo 'Formatting...' . PHP_EOL;
exec('npm run format');

echo 'Build complete!' . PHP_EOL;
