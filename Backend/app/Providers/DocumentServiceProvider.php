<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\DocumentConversionService;

class DocumentServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton(DocumentConversionService::class, function ($app) {
            return new DocumentConversionService();
        });
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        //
    }
}
