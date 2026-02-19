<?php

use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

// 1. Helper Functions
route('home');
// signedRoute('dashboard');
to_route('dashboard');

// 2. Redirect Facade & Helper
Redirect::route('home');
Redirect::signedRoute('dashboard');
Redirect::temporarySignedRoute('home');
redirect()->route('dashboard');

// 3. URL Facade & Helper
URL::route('home');
URL::signedRoute('dashboard');
URL::temporarySignedRoute('home');
url()->route('dashboard');

// 4. Response Facade & Factory
Response::redirectToRoute('home');
response()->redirectToRoute('dashboard');

// 5. Route & Request Facades
Route::is('dashboard');
Request::routeIs('home');
request()->routeIs('dashboard');
