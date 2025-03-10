// This file was generated from php-templates/inertia.php, do not edit directly
export default `
echo json_encode([
    ...config('inertia.testing', []),
    'page_paths' => collect(config('inertia.testing.page_paths', []))->flatMap(function($path) {
        $relativePath = LaravelVsCode::relativePath($path);

        return [$relativePath, mb_strtolower($relativePath)];
    })->unique()->values(),
]);
`;