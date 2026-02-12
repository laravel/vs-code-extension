<?php

error_reporting(E_ERROR | E_PARSE);

define('LARAVEL_START', microtime(true));

require_once __DIR__ . '/../autoload.php';

$type = null;

$classLike = __VSCODE_LARAVEL_CLASSLIKE__;

if (trait_exists($classLike)) {
    $type = 'trait';
} elseif (class_exists($classLike)) {
    $type = 'class';
}

echo json_encode(['type' => $type]);