// This file was generated from php-templates/inertia.php, do not edit directly
export default `
$config = config('inertia.testing', []);

$pagePaths = collect($config['page_paths'] ?? [])->map(function($path) {
    return LaravelVsCode::relativePath($path);
});

$pageHints = collect(app('inertia.testing.view-finder')->getHints())->mapWithKeys(function ($value, $key) {
    return ["{$value[0]}" => $key];
});

$config['page_paths'] = $pagePaths->concat($pageHints->keys())->toArray();
$config['page_hints'] = $pageHints->toArray();

echo json_encode($config);
`;