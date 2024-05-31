<?php

echo collect(app('router')->getRoutes()->getRoutes())
    ->map(function ($route) {
        return [
            'method' => collect($route->methods())->filter(function ($method) {
                return $method !== 'HEAD';
            })->implode('|'),
            'uri' => $route->uri(),
            'name' => $route->getName(),
            'action' => str_replace('App\\Http\\Controllers\\', '', $route->getActionName()),
            'parameters' => $route->parameterNames()
        ];
    })
    ->toJson();
