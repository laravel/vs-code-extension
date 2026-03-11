<?php
use Illuminate\Support\Facades\Route;


	require __DIR__.'/api/invoices.php';
	require __DIR__.'/api/users.php';

	Route::prefix('senderNames')->group(function () {
		require base_path('/routes/v2/sender-names/sender_names.php');
	});

	Route::get('/health', fn () => ['status' => 'ok'])->name('api.health');