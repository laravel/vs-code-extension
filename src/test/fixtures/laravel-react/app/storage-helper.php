<?php

use Illuminate\Support\Facades\Storage;

Storage::disk('local');
Storage::disk('public');
Storage::fake('public');
Storage::disk('missing');
