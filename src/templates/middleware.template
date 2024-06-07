<?php

echo collect(app('Illuminate\Contracts\Http\Kernel')->getMiddlewareGroups())
    ->merge(app('Illuminate\Contracts\Http\Kernel')->getRouteMiddleware())
    ->map(function ($middleware, $key) {
        if (is_array($middleware)) {
            return null;
        }

        $parameters = collect((new ReflectionMethod($middleware, 'handle'))->getParameters())
            ->filter(function ($rc) {
                return $rc->getName() !== 'request' && $rc->getName() !== 'next';
            })
            ->map(function ($rc) {
                return $rc->getName() . ($rc->isVariadic() ? '...' : '');
            })
            ->implode(',');

        return $parameters === '' ? null : $parameters;
    })
    ->toJson();