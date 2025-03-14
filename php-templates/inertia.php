<?php

echo json_encode([
    ...config('inertia.testing', []),
    'page_paths' => collect(config('inertia.testing.page_paths', []))->flatMap(function($path) {
        $relativePath = LaravelVsCode::relativePath($path);

        return [$relativePath, mb_strtolower($relativePath)];
    })->unique()->values(),
]);
