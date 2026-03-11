<?php

use Illuminate\Support\Facades\Route;

Route::get('/invoices', 'InvoiceController@index')->name('api.invoices.index');
Route::get('/invoices/{invoice}', 'InvoiceController@show')->name('api.invoices.show');
