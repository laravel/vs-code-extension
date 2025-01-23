// This file was generated from php-templates/bootstrap-laravel.php, do not edit directly
export default `
error_reporting(E_ERROR | E_PARSE);

define('LARAVEL_START', microtime(true));

define('__VSCODE_LARAVEL_START_OUTPUT__', '__VSCODE_LARAVEL_START_OUTPUT__');
define('__VSCODE_LARAVEL_END_OUTPUT__', '__VSCODE_LARAVEL_END_OUTPUT__');
define('__VSCODE_LARAVEL_ERROR__', '__VSCODE_LARAVEL_ERROR__');

try {
    require_once __DIR__ . '/../autoload.php';
    $app = require_once __DIR__ . '/../../bootstrap/app.php';
} catch (Throwable $e) {
    echo __VSCODE_LARAVEL_START_OUTPUT__;
    echo json_encode([
        __VSCODE_LARAVEL_ERROR__ => $e->getMessage(),
    ]);
    echo __VSCODE_LARAVEL_END_OUTPUT__;
    exit(1);
}

class VsCodeLaravel extends \\Illuminate\\Support\\ServiceProvider
{
    public function register()
    {
    }

    public function boot()
    {
        config([
            'logging.channels.null' => [
                'driver' => 'monolog',
                'handler' => \\Monolog\\Handler\\NullHandler::class,
            ],
            'logging.default' => 'null',
        ]);
    }
}

function vsCodeToRelativePath($path)
{
    if (!str_contains($path, base_path())) {
        return (string) $path;
    }

    return ltrim(str_replace(base_path(), '', realpath($path)), DIRECTORY_SEPARATOR);
}

$app->register(new VsCodeLaravel($app));
$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

echo __VSCODE_LARAVEL_START_OUTPUT__;
__VSCODE_LARAVEL_OUTPUT__;
echo __VSCODE_LARAVEL_END_OUTPUT__;

exit(0);
`;