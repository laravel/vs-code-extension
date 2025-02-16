<?php

echo collect(app()->getBindings())
    ->filter(fn ($binding) => ($binding['concrete'] ?? null) !== null)
    ->flatMap(function ($binding, $key) {
        $boundTo = new ReflectionFunction($binding['concrete']);

        $closureClass = $boundTo->getClosureScopeClass();

        if ($closureClass === null) {
            return [];
        }

        return [
            $key => [
                'path' => LaravelVsCode::relativePath($closureClass->getFileName()),
                'class' => $closureClass->getName(),
                'line' => $boundTo->getStartLine(),
            ],
        ];
    })->toJson();
