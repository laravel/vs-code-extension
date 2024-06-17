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

        $data = json_decode($output->fetch(), true);

        if ($data === null) {
            return null;
        }

        $data['attributes'] = collect($data['attributes'])
            ->map(function ($attrs) {
                return array_merge($attrs, [
                    'title_case' => str_replace('_', '', \Illuminate\Support\Str::title($attrs['name'])),
                ]);
            })
            ->toArray();

        $reflection = (new \ReflectionClass($className));

        $data['scopes'] = collect($reflection->getMethods())
            ->filter(function ($method) {
                return $method->isPublic() && !$method->isStatic() && $method->name !== '__construct';
            })
            ->filter(function ($method) {
                return str_starts_with($method->name, 'scope');
            })
            ->map(function ($method) {
                return str_replace('scope', '', $method->name);
            })
            ->map(function ($method) {
                return strtolower(substr($method, 0, 1)) . substr($method, 1);
            })
            ->values()
            ->toArray();

        $data['uri'] = $reflection->getFileName();

        return [
            $className => $data,
        ];
    })
    ->filter()
    ->toJson();
