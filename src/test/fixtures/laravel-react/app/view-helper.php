<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\View;

view('app');
View::make('app');
Route::view('view-link', 'app');
view('missing-view');
