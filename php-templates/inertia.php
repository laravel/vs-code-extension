<?php

echo json_encode([
    ...config('inertia.testing', []),
    'page_paths' => collect(config('inertia.testing.page_paths', []))->map(fn($path) => LaravelVsCode::relativePath($path))->toArray(),
]);
