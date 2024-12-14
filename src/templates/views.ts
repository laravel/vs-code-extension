export default `
function vsCodeFindBladeFiles($path)
{
  $paths = [];

  if (!is_dir($path)) {
    return $paths;
  }

  foreach (
    \\Symfony\\Component\\Finder\\Finder::create()
      ->files()
      ->name("*.blade.php")
      ->in($path)
    as $file
  ) {
    $paths[] = [
      "path" => $file->getRealPath(),
      "isVendor" => str_contains($file->getRealPath(), base_path("vendor")),
      "key" => \\Illuminate\\Support\\Str::of($file->getRealPath())
        ->replace(realpath($path), "")
        ->replace(".blade.php", "")
        ->ltrim("/")
        ->replace("/", ".")
    ];
  }

  return $paths;
}
$paths = collect(
  app("view")
    ->getFinder()
    ->getPaths()
)->flatMap(function ($path) {
  return vsCodeFindBladeFiles($path);
});

$hints = collect(
  app("view")
    ->getFinder()
    ->getHints()
)->flatMap(function ($paths, $key) {
  return collect($paths)->flatMap(function ($path) use ($key) {
    return collect(vsCodeFindBladeFiles($path))->map(function ($value) use (
      $key
    ) {
      return array_merge($value, ["key" => "{$key}::{$value["key"]}"]);
    });
  });
});

[$local, $vendor] = $paths
  ->merge($hints)
  ->values()
  ->partition(function ($v) {
    return !$v["isVendor"];
  });

echo $local
  ->sortBy("key", SORT_NATURAL)
  ->merge($vendor->sortBy("key", SORT_NATURAL))
  ->toJson();
`;
