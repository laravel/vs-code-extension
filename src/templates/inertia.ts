// This file was generated from php-templates/inertia.php, do not edit directly
export default `
echo json_encode([
    ...config('inertia.testing', []),
    'page_paths' => collect(config('inertia.testing.page_paths', []))->map(fn($path) => LaravelVsCode::relativePath($path))->toArray(),
]);
`;