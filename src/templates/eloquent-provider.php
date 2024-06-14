<?php
collect(glob(base_path('**/Models/*.php')))->each(fn ($file) => include_once($file));

echo collect(get_declared_classes())
    ->filter(function ($class) {
        return is_subclass_of($class, \Illuminate\Database\Eloquent\Model::class);
    })
    ->filter(function ($class) {
        return !in_array($class, [\Illuminate\Database\Eloquent\Relations\Pivot::class, \Illuminate\Foundation\Auth\User::class]);
    })
    ->values()
    ->flatMap(function (string $className) {
        $output = new \Symfony\Component\Console\Output\BufferedOutput();

        \Illuminate\Support\Facades\Artisan::call(
            "model:show",
            [
                "model" => $className,
                "--json" => true,
            ],
            $output
        );

        return [
            $className => json_decode($output->fetch(), true),
        ];
    })
    ->toJson();