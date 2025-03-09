// This file was generated from php-templates/inertia.php, do not edit directly
export default `
$config = config('inertia.testing', []);

$pagePaths = collect($config['page_paths'] ?? [])->flatMap(function($path) {
    $relativePath = LaravelVsCode::relativePath($path);

    // Folder with inertia pages views is usually uppercase (resources/js/Pages),
    // but Laravel starter kits use lowercase (resources/js/pages)
    return [$relativePath, mb_strtolower($relativePath)];
})->unique();

$config['page_paths'] = $pagePaths->toArray();

echo json_encode($config);
`;