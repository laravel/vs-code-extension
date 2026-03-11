<?php

use Illuminate\Support\Facades\Route;

Route::get('/reports', fn () => ['source' => 'web-api'])->name('web.api.reports.index');
Route::get('/reports/{report}', fn (string $report) => ['report' => $report])->name('web.api.reports.show');
