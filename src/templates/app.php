<?php

collect(app()->getBindings())
    ->filter(fn ($binding) => ($binding['concrete'] ?? null) !== null)
    ->flatMap(function ($binding, $key) {
        $boundTo = new ReflectionFunction($binding['concrete']);

        $closureClass = $boundTo->getClosureScopeClass();

        return [
            $key => [
                'uri' => $closureClass->getFileName(),
                'class' => $closureClass->getName(),
                'startLine' => $boundTo->getStartLine(),
            ],
        ];
    })->toJson();