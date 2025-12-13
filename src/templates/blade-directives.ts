// This file was generated from php-templates/blade-directives.php, do not edit directly
export default `
echo collect(app(\\Illuminate\\View\\Compilers\\BladeCompiler::class)->getCustomDirectives())
    ->map(function ($customDirective, $name) {
        if ($customDirective instanceof \\Closure) {
            return [
                'name' => $name,
                'hasParams' => (new ReflectionFunction($customDirective))->getNumberOfParameters() >= 1,
            ];
        }

        if (is_array($customDirective)) {
            return [
                'name' => $name,
                'hasParams' => (new ReflectionMethod($customDirective[0], $customDirective[1]))->getNumberOfParameters() >= 1,
            ];
        }

        return null;
    })
    ->filter()
    ->values()
    ->toJson();
`;