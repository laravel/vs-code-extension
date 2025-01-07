<?php

error_reporting(E_ERROR | E_PARSE);

define('LARAVEL_START', microtime(true));

require_once __DIR__ . '/../autoload.php';
$app = require_once __DIR__ . '/../../bootstrap/app.php';

class VsCodeLaravel extends \Illuminate\Support\ServiceProvider
{
    public function register()
    {
    }

    public function boot()
    {
        if (method_exists($this->app['log'], 'setHandlers')) {
            $this->app['log']->setHandlers([new \Monolog\Handler\ProcessHandler()]);
        }
    }
}

function vsCodeToRelativePath($path)
{
    return ltrim(str_replace(base_path(), '', $path), DIRECTORY_SEPARATOR);
}

$app->register(new VsCodeLaravel($app));
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo '__VSCODE_LARAVEL_START_OUTPUT__';
__VSCODE_LARAVEL_OUTPUT__;
echo '__VSCODE_LARAVEL_END_OUTPUT__';

exit(0);
