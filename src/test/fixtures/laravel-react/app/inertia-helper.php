<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Inertia::render('welcome');
Route::inertia('inertia-0', 'dashboard');
Inertia::render('dashboard');
