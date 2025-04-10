<?php

collect(glob(base_path('**/Models/*.php')))->each(fn($file) => include_once($file));

$modelPolicies = collect(get_declared_classes())
    ->filter(fn($class) => is_subclass_of($class, \Illuminate\Database\Eloquent\Model::class))
    ->filter(fn($class) => !in_array($class, [
        \Illuminate\Database\Eloquent\Relations\Pivot::class,
        \Illuminate\Foundation\Auth\User::class,
    ]))
    ->flatMap(fn($class) => [
        $class => \Illuminate\Support\Facades\Gate::getPolicyFor($class),
    ])
    ->filter(fn($policy) => $policy !== null);

function vsCodeGetAuthenticatable() {
    try {
        $guard = auth()->guard();

        $reflection = new \ReflectionClass($guard);

        if (!$reflection->hasProperty("provider")) {
            return null;
        }

        $property = $reflection->getProperty("provider");
        $provider = $property->getValue($guard);

        if ($provider instanceof \Illuminate\Auth\EloquentUserProvider) {
            $providerReflection = new \ReflectionClass($provider);
            $modelProperty = $providerReflection->getProperty("model");

            return str($modelProperty->getValue($provider))->prepend("\\")->toString();
        }

        if ($provider instanceof \Illuminate\Auth\DatabaseUserProvider) {
            return str(\Illuminate\Auth\GenericUser::class)->prepend("\\")->toString();
        }
    } catch (\Exception | \Throwable $e) {
        return null;
    }

    return null;
}

function vsCodeGetPolicyInfo($policy, $model)
{
    $methods = (new ReflectionClass($policy))->getMethods();

    return collect($methods)->map(fn(ReflectionMethod $method) => [
        'key' => $method->getName(),
        'uri' => $method->getFileName(),
        'policy' => is_string($policy) ? $policy : get_class($policy),
        'model' => $model,
        'line' => $method->getStartLine(),
    ])->filter(fn($ability) => !in_array($ability['key'], ['allow', 'deny']));
}

echo json_encode([
    'authenticatable' => vsCodeGetAuthenticatable(),
    'policies' => collect(\Illuminate\Support\Facades\Gate::abilities())
                    ->map(function ($policy, $key) {
                        $reflection = new \ReflectionFunction($policy);
                        $policyClass = null;
                        $closureThis = $reflection->getClosureThis();

                        if ($closureThis !== null) {
                            if (get_class($closureThis) === \Illuminate\Auth\Access\Gate::class) {
                                $vars = $reflection->getClosureUsedVariables();

                                if (isset($vars['callback'])) {
                                    [$policyClass, $method] = explode('@', $vars['callback']);

                                    $reflection = new \ReflectionMethod($policyClass, $method);
                                }
                            }
                        }

                        return [
                            'key' => $key,
                            'uri' => $reflection->getFileName(),
                            'policy' => $policyClass,
                            'line' => $reflection->getStartLine(),
                        ];
                    })
                    ->merge(
                        collect(\Illuminate\Support\Facades\Gate::policies())->flatMap(fn($policy, $model) => vsCodeGetPolicyInfo($policy, $model)),
                    )
                    ->merge(
                        $modelPolicies->flatMap(fn($policy, $model) => vsCodeGetPolicyInfo($policy, $model)),
                    )
                    ->values()
                    ->groupBy('key')
                    ->map(fn($item) => $item->map(fn($i) => \Illuminate\Support\Arr::except($i, 'key'))),
]);
