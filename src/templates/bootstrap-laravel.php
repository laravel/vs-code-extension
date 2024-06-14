<?php
define('LARAVEL_START', microtime(true));

require_once '__VSCODE_LARAVEL_VENDOR_AUTOLOAD_PATH__';
$app = require_once '__VSCODE_LARAVEL_BOOTSTRAP_PATH__';

class VsCodeLaravel extends \Illuminate\Support\ServiceProvider
{
    public function register()
    {
        //
    }

    public function boot()
    {
        if (method_exists($this->app['log'], 'setHandlers')) {
            $this->app['log']->setHandlers([new \Monolog\Handler\ProcessHandler()]);
        }
    }
}

$app->register(new VsCodeLaravel($app));
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo '__VSCODE_LARAVEL_START_OUTPUT__';
__VSCODE_LARAVEL_OUTPUT__;
echo '__VSCODE_LARAVEL_END_OUTPUT__';

exit(0);
