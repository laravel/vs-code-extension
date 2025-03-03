// This file was generated from php-templates/views.php, do not edit directly
export default `
$blade = new class {
  public function findFiles($path)
  {
    $paths = [];

    if (!is_dir($path)) {
      return $paths;
    }

    $files = \\Symfony\\Component\\Finder\\Finder::create()
      ->files()
      ->name("*.blade.php")
      ->in($path);

    foreach ($files as $file) {
      $paths[] = [
        "path" => str_replace(base_path(DIRECTORY_SEPARATOR), '', $file->getRealPath()),
        "isVendor" => str_contains($file->getRealPath(), base_path("vendor")),
        "key" => \\Illuminate\\Support\\Str::of($file->getRealPath())
          ->replace(realpath($path), "")
          ->replace(".blade.php", "")
          ->ltrim(DIRECTORY_SEPARATOR)
          ->replace(DIRECTORY_SEPARATOR, ".")
      ];
    }

    return $paths;
  }
};

$paths = collect(
  app("view")
    ->getFinder()
    ->getPaths()
)->flatMap(fn($path) => $blade->findFiles($path));

$hints = collect(
  app("view")
    ->getFinder()
    ->getHints()
)->flatMap(
  fn($paths, $key) => collect($paths)->flatMap(
    fn($path) => collect($blade->findFiles($path))->map(
      fn($value) => array_merge($value, ["key" => "{$key}::{$value["key"]}"])
    )
  )
);

[$local, $vendor] = $paths
  ->merge($hints)
  ->values()
  ->partition(fn($v) => !$v["isVendor"]);

echo $local
  ->sortBy("key", SORT_NATURAL)
  ->merge($vendor->sortBy("key", SORT_NATURAL))
  ->toJson();
`;