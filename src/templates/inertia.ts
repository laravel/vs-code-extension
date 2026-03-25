// This file was generated from php-templates/inertia.php, do not edit directly
export default `
$pageExtensions = config(
    'inertia.pages.extensions',
    config('inertia.page_extensions', config('inertia.testing.page_extensions', [])),
);

$pagePaths = config(
    'inertia.pages.paths',
    config('inertia.page_paths', config('inertia.testing.page_paths', [])),
);

echo json_encode([
    'page_extensions' => $pageExtensions,
    'page_paths' => collect($pagePaths)->flatMap(function($path) {
        $relativePath = LaravelVsCode::relativePath($path);

        return [$relativePath, mb_strtolower($relativePath)];
    })->unique()->values(),
]);
`;
