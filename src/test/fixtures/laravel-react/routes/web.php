<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::prefix('api')->group(function () {
    require base_path('/routes/web/api/reports.php');

    Route::prefix('admin')->group(function () {
        require base_path('/routes/web/api/admin/users.php');
    });
});

require __DIR__.'/settings.php';
