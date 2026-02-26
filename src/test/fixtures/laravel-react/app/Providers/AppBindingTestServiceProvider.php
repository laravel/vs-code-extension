<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppBindingTestServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind('test.binding', fn () => new \stdClass());
        $this->app->bind('test.binding.alt', fn () => new \stdClass());
    }
}
