<?php

echo collect(app("Illuminate\Contracts\Http\Kernel")->getMiddlewareGroups())
  ->merge(app("Illuminate\Contracts\Http\Kernel")->getRouteMiddleware())
  ->map(function ($middleware, $key) {
    $result = [
      "class" => null,
      "path" => null,
      "line" => null,
      "parameters" => null,
      "groups" => [],
    ];

    if (is_array($middleware)) {
      $result["groups"] = collect($middleware)->map(function ($m) {
        if (!class_exists($m)) {
          return [
            "class" => $m,
            "path" => null,
            "line" => null
          ];
        }

        $reflected = new ReflectionClass($m);
        $reflectedMethod = $reflected->getMethod("handle");

        return [
          "class" => $m,
          "path" => LaravelVsCode::relativePath($reflected->getFileName()),
          "line" =>
              $reflectedMethod->getFileName() === $reflected->getFileName()
              ? $reflectedMethod->getStartLine()
              : null
        ];
      })->all();

      return $result;
    }

    $reflected = new ReflectionClass($middleware);
    $reflectedMethod = $reflected->getMethod("handle");

    $result = array_merge($result, [
      "class" => $middleware,
      "path" => LaravelVsCode::relativePath($reflected->getFileName()),
      "line" => $reflectedMethod->getStartLine(),
    ]);

    $parameters = collect($reflectedMethod->getParameters())
      ->filter(function ($rc) {
        return $rc->getName() !== "request" && $rc->getName() !== "next";
      })
      ->map(function ($rc) {
        return $rc->getName() . ($rc->isVariadic() ? "..." : "");
      });

    if ($parameters->isEmpty()) {
      return $result;
    }

    return array_merge($result, [
      "parameters" => $parameters->implode(",")
    ]);
  })
  ->toJson();
