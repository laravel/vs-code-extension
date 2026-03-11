<?php

use Illuminate\Support\Facades\Route;

Route::get('/users', 'UserController@index')->name('api.users.index');
Route::post('/users', 'UserController@store')->name('api.users.store');
Route::get('/users/{user}', 'UserController@show')->name('api.users.show');
