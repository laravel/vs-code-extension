<?php

echo collect(app('router')->getRoutes()->getRoutes())
        ->map(function ($route) {
            if ($route->getActionName() === 'Closure') {
                $reflection = new \ReflectionFunction($route->getAction()['uses']);
            } else if (str_contains($route->getActionName(), '@')) {
                [$class, $method] = explode('@', $route->getActionName());
                $reflection = new \ReflectionMethod($class, $method);
            } else {
                $reflection = new \ReflectionClass($route->getActionName());
            }

            return [
                'method' => collect($route->methods())->filter(function ($method) {
                    return $method !== 'HEAD';
                })->implode('|'),
                'uri' => $route->uri(),
                'name' => $route->getName(),
                'action' => str_replace('App\\Http\\Controllers\\', '', $route->getActionName()),
                'parameters' => $route->parameterNames(),
                'filename' => $reflection->getFileName(),
                'line' => $reflection->getStartLine(),
            ];
        })
        ->toJson();