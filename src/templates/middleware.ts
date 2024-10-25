export default `
echo collect(app("Illuminate\\Contracts\\Http\\Kernel")->getMiddlewareGroups())
  ->merge(app("Illuminate\\Contracts\\Http\\Kernel")->getRouteMiddleware())
  ->map(function ($middleware, $key) {
    $result = [
      "class" => null,
      "uri" => null,
      "startLine" => null,
      "parameters" => null
    ];

    if (is_array($middleware)) {
      return $result;
    }

    $reflected = new ReflectionClass($middleware);
    $reflectedMethod = $reflected->getMethod("handle");

    $result = array_merge($result, [
      "class" => $middleware,
      "uri" => $reflected->getFileName(),
      "startLine" => $reflectedMethod->getStartLine(),
      "parameters" => null
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
`;
