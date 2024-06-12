<?php

echo json_encode(
    array_merge(
        array_keys(Illuminate\Support\Facades\Gate::abilities()),
        array_values(
            array_filter(
                array_unique(
                    Illuminate\Support\Arr::flatten(
                        array_map(
                            function ($val, $key) {
                                return array_map(
                                    function ($rm) {
                                        return $rm->getName();
                                    },
                                    (new ReflectionClass($val))->getMethods()
                                );
                            },
                            Illuminate\Support\Facades\Gate::policies(),
                            array_keys(Illuminate\Support\Facades\Gate::policies())
                        )
                    )
                ),
                function ($an) {
                    return !in_array($an, ['allow', 'deny']);
                }
            )
        )
    )
);
