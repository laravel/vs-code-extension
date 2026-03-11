<?php

use Illuminate\Support\Facades\Route;

Route::get('/users', fn () => ['source' => 'web-api-admin'])->name('web.api.admin.users.index');
Route::get('/users/{user}', fn (string $user) => ['user' => $user])->name('web.api.admin.users.show');
