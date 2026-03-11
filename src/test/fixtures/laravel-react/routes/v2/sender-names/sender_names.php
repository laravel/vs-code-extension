<?php

use Illuminate\Support\Facades\Route;

Route::get('/', 'SenderNameController@index')->name('api.senderNames.index');
Route::get('/{senderName}', 'SenderNameController@show')->name('api.senderNames.show');
