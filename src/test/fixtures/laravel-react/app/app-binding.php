<?php

use Illuminate\Support\Facades\App;

app('test.binding');
app()->make('test.binding.alt');
app()->bound('test.binding');
app('missing.binding');

App::make('test.binding.alt');
App::bound('test.binding');
App::isShared('test.binding.alt');
