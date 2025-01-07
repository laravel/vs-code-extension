<?php

echo collect(app()->getBindings())
    ->filter(fn ($binding) => ($binding['concrete'] ?? null) !== null)
    ->flatMap(function ($binding, $key) {
        $boundTo = new ReflectionFunction($binding['concrete']);

        $closureClass = $boundTo->getClosureScopeClass();

        return [
            $key => [
                'path' => vsCodeToRelativePath($closureClass->getFileName()),
                'class' => $closureClass->getName(),
                'line' => $boundTo->getStartLine(),
            ],
        ];
    })->toJson();
