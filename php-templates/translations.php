<?php

function vsCodeGetTranslationsFromFile($file, $path, $namespace)
{
  $key = pathinfo($file, PATHINFO_FILENAME);

  if ($namespace) {
    $key = "{$namespace}::{$key}";
  }

  $lang = collect(explode("/", str_replace($path, "", $file)))
    ->filter()
    ->first();

  $fileLines = \Illuminate\Support\Facades\File::lines($file);
  $lines = [];
  $inComment = false;

  foreach ($fileLines as $index => $line) {
    $trimmed = trim($line);

    if (substr($trimmed, 0, 2) === "/*") {
      $inComment = true;
      continue;
    }

    if ($inComment) {
      if (substr($trimmed, -2) !== "*/") {
        continue;
      }

      $inComment = false;
    }

    if (substr($trimmed, 0, 2) === "//") {
      continue;
    }

    $lines[] = [$index + 1, $trimmed];
  }

  return [
    "k" => $key,
    "la" => $lang,
    "vs" => collect(\Illuminate\Support\Arr::dot((\Illuminate\Support\Arr::wrap(__($key, [], $lang)))))
      ->map(
        fn($value, $key) => vsCodeTranslationValue(
          $key,
          $value,
          str_replace(base_path("/"), "", $file),
          $lines
        )
      )
      ->filter()
  ];
}

function vsCodeTranslationValue($key, $value, $file, $lines): ?array
{
  if (is_array($value)) {
    return null;
  }

  $lineNumber = 1;
  $keys = explode(".", $key);
  $index = 0;
  $currentKey = array_shift($keys);

  foreach ($lines as $index => $line) {
    if (
      strpos($line[1], '"' . $currentKey . '"', 0) !== false ||
      strpos($line[1], "'" . $currentKey . "'", 0) !== false
    ) {
      $lineNumber = $line[0];
      $currentKey = array_shift($keys);
    }

    if ($currentKey === null) {
      break;
    }
  }

  return [
    "v" => $value,
    "p" => $file,
    "li" => $lineNumber,
    "pa" => preg_match_all("/\:([A-Za-z0-9_]+)/", $value, $matches)
      ? $matches[1]
      : []
  ];
}

function vscodeCollectTranslations(string $path, ?string $namespace = null)
{
  return collect(glob(realpath($path) . "/**/*.{php,json}", GLOB_BRACE))->map(
    fn($file) => vsCodeGetTranslationsFromFile($file, $path, $namespace)
  );
}

$loader = app("translator")->getLoader();
$namespaces = $loader->namespaces();

$reflection = new ReflectionClass($loader);
$property = $reflection->hasProperty("paths")
  ? $reflection->getProperty("paths")
  : $reflection->getProperty("path");
$property->setAccessible(true);

$paths = \Illuminate\Support\Arr::wrap($property->getValue($loader));

$default = collect($paths)->flatMap(
  fn($path) => vscodeCollectTranslations($path)
);

$namespaced = collect($namespaces)->flatMap(
  fn($path, $namespace) => vscodeCollectTranslations($path, $namespace)
);

$final = [];

foreach ($default->merge($namespaced) as $value) {
  foreach ($value["vs"] as $key => $v) {
    $dotKey = "{$value["k"]}.{$key}";

    if (!isset($final[$dotKey])) {
      $final[$dotKey] = [];
    }

    $final[$dotKey][$value["la"]] = $v;

    if ($value["la"] === \Illuminate\Support\Facades\App::currentLocale()) {
      $final[$dotKey]["default"] = $v;
    }
  }
}

echo json_encode($final);
