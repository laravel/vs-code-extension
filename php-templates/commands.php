<?php

echo collect(app("Illuminate\Contracts\Console\Kernel")->all())
  ->map(function ($command, $name) {
    $result = [
      "name" => $name,
      "class" => get_class($command),
      "description" => $command->getDescription(),
      "path" => null,
      "line" => null,
    ];

    // Closure commands (Artisan::command with a callback) have no dedicated
    // class to navigate to. They are kept in the index (so they are not flagged
    // as unknown) but without a navigation target.
    if ($command instanceof \Illuminate\Foundation\Console\ClosureCommand) {
      return $result;
    }

    $reflected = new ReflectionClass($command);
    $path = $reflected->getFileName();

    if ($path === false) {
      return $result;
    }

    return array_merge($result, [
      "path" => LaravelVsCode::relativePath($path),
      "line" => $reflected->getStartLine(),
    ]);
  })
  ->values()
  ->toJson();
