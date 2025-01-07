// This file was generated from php-templates/inertia.php, do not edit directly
export default `
$config = config('inertia.testing');

$pagePaths = collect($config['page_paths'] ?? [])->map(function($path) {
    return vsCodeToRelativePath($path);
});

$config['page_paths'] = $pagePaths->toArray();

echo json_encode($config);
`;