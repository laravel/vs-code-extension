<?php
collect(glob(base_path('**/Models/*.php')))
        ->each(fn ($file) => include_once($file));

    $models = collect(get_declared_classes())
        ->filter(function ($class) {
            return is_subclass_of($class, 'Illuminate\Database\Eloquent\Model');
        })
        ->filter(function ($class) {
            return !in_array($class, [\Illuminate\Database\Eloquent\Relations\Pivot::class, \Illuminate\Foundation\Auth\User::class]);
        })
        ->values()
        ->flatMap(function ($class) {
            return [$class => new \ReflectionClass($class)];
        })
        ->map(function (ReflectionClass $reflection, string $className) {

            $shortName = $reflection->getShortName();
            $pluralName = \Illuminate\Support\Str::plural($shortName);

            $output = [
                'name' => $shortName,
                'camelCase' => \Illuminate\Support\Str::camel($shortName),
                'snakeCase' => \Illuminate\Support\Str::snake($shortName),
                'pluralCamelCase' => \Illuminate\Support\Str::camel($pluralName),
                'pluralSnakeCase' => \Illuminate\Support\Str::snake($pluralName),
                'attributes' => [],
                'accessors' => [],
                'relations' => []
            ];

            try {
                $model = app($className);

                $output['attributes'] = collect(
                    $model->getFillable(),
                    $model->getAttributes(),
                    $model->getGuarded(),
                )
                    ->filter(function ($attr) {
                        return $attr !== '*';
                    })
                    ->unique()
                    ->sort()
                    ->values()
                    ->map(function ($attribute) {
                        return [
                            'default' => $attribute,
                            'snake' => Illuminate\Support\Str::snake($attribute),
                            'camel' => Illuminate\Support\Str::camel($attribute),
                        ];
                    })
                    ->toArray();
            } catch (\Throwable $e) {
            }

            try {
                $output['relations'] = collect($reflection->getMethods())
                    ->filter(function ($method) {
                        return $method->isStatic() === false && $method->isPublic() === false;
                    })
                    ->filter(function ($method) {
                        return !in_array(substr($method->getName(), 0, 3), ['get', 'set']);
                    })
                    ->filter(function ($method) {
                        return count($method->getParameters()) === 0;
                    })
                    ->filter(function ($method) {
                        // TODO: Whoa now fix this up, what in the world
                        return preg_match(
                            '/belongsTo|hasMany|hasOne|morphOne|morphMany|morphTo/',
                            implode('', array_slice(file($method->getFileName()), $method->getStartLine(), $method->getEndLine() - $method->getStartLine() - 1)),
                        );
                    })
                    ->map(function ($method) {
                        return $method->getName();
                    })
                    ->sort()
                    ->values()
                    ->toArray();
            } catch (\Throwable $e) {
            }

            try {
                $output['accessors'] = collect($reflection->getMethods())
                    ->filter(function ($method) {
                        return substr($method->getName(), 0, 3) === 'get';
                    })
                    ->filter(function ($method) {
                        return substr($method->getName(), -9) === 'Attribute';
                    })
                    ->filter(function ($method) {
                        return !empty(substr($method->getName(), 3, -9));
                    })
                    ->map(function ($method) {
                        $attributeName = substr($method->getName(), 3, -9);

                        return [
                            'default' => $attributeName,
                            'snake' => \Illuminate\Support\Str::snake($attributeName),
                            'camel' => \Illuminate\Support\Str::camel($attributeName),
                        ];
                    })
                    ->values()
                    ->toArray();
            } catch (\Throwable $e) {
            }

            return $output;
        });

echo $models;