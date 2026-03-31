<?php

use Illuminate\Routing\Attributes\Controllers\Middleware;
use Illuminate\Support\Facades\Route;

Route::middleware('test.middleware')->get('middleware-link', fn () => null);
Route::withoutMiddleware('test.middleware')->get('middleware-1', fn () => null);
Route::middleware('test.middleware')->get('middleware-2', fn () => null);
Route::withoutMiddleware(['test.middleware'])->get('middleware-link-2', fn () => null);
Route::middleware('missing.middleware')->get('middleware-missing', fn () => null);

#[Middleware('test.middleware')]
class MiddlewareAttributeHelper {}

#[Middleware('missing.middleware')]
class MiddlewareAttributeMissingHelper {}
