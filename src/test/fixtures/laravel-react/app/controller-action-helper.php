<?php

use Illuminate\Support\Facades\Route;

Route::get('controller-action-0', '0');
Route::get('controller-action-1', '1');
Route::get('controller-action-2', '2');

Route::get('controller-action-link', 'App\\Http\\Controllers\\Settings\\ProfileController@edit');
Route::get('controller-action-missing', 'App\\Http\\Controllers\\MissingController@missing');
