// This file was generated from php-templates/inertia.php, do not edit directly
export default `
echo json_encode([
    'page_extensions' => config('inertia.page_extensions', config('inertia.testing.page_extensions', [])),
    'page_paths' => collect(config('inertia.page_paths', config('inertia.testing.page_paths', [])))->flatMap(function($path) {
        $relativePath = LaravelVsCode::relativePath($path);

        return [$relativePath, mb_strtolower($relativePath)];
    })->unique()->values(),
]);
`;