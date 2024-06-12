<?php
foreach (__VSCODE_LARAVEL_MODEL_PATHS__ as $modelPath) {
    if (is_dir(base_path($modelPath))) {
        foreach (scandir(base_path($modelPath)) as $sourceFile) {
            if (substr($sourceFile, -4) === '.php' && is_file(base_path("$modelPath/$sourceFile"))) {
                include_once base_path("$modelPath/$sourceFile");
            }
        }
    }
}

$modelClasses = array_values(array_filter(get_declared_classes(), function ($declaredClass) {
    return is_subclass_of($declaredClass, 'Illuminate\Database\Eloquent\Model') && $declaredClass != 'Illuminate\Database\Eloquent\Relations\Pivot' && $declaredClass != 'Illuminate\Foundation\Auth\User';
}));

$output = [];

foreach ($modelClasses as $modelClass) {
    $classReflection = new \ReflectionClass($modelClass);
    $output[$modelClass] = [
        'name' => $classReflection->getShortName(),
        'camelCase' => Illuminate\Support\Str::camel($classReflection->getShortName()),
        'snakeCase' => Illuminate\Support\Str::snake($classReflection->getShortName()),
        'pluralCamelCase' => Illuminate\Support\Str::camel(Illuminate\Support\Str::plural($classReflection->getShortName())),
        'pluralSnakeCase' => Illuminate\Support\Str::snake(Illuminate\Support\Str::plural($classReflection->getShortName())),
        'attributes' => [],
        'accessors' => [],
        'relations' => []
    ];

    try {
        $modelInstance = $modelClass::first();
        $attributes = array_values(array_unique(array_merge(app($modelClass)->getFillable(), array_keys($modelInstance ? $modelInstance->getAttributes() : []))));
        $output[$modelClass]['attributes'] = array_map(function ($attribute) {
            return ['default' => $attribute, 'snake' => Illuminate\Support\Str::snake($attribute), 'camel' => Illuminate\Support\Str::camel($attribute)];
        }, $attributes);
    } catch (\Throwable $e) {
    }

    foreach ($classReflection->getMethods() as $classMethod) {
        try {
            if (
                $classMethod->isStatic() == false &&
                $classMethod->isPublic() == true &&
                substr($classMethod->getName(), 0, 3) != 'get' &&
                substr($classMethod->getName(), 0, 3) != 'set' &&
                count($classMethod->getParameters()) == 0 &&
                preg_match('/belongsTo|hasMany|hasOne|morphOne|morphMany|morphTo/', implode('', array_slice(file($classMethod->getFileName()), $classMethod->getStartLine(), $classMethod->getEndLine() - $classMethod->getStartLine() - 1)))
            ) {
                $output[$modelClass]['relations'][] = $classMethod->getName();
            } elseif (
                substr($classMethod->getName(), 0, 3) == 'get' &&
                substr($classMethod->getName(), -9) == 'Attribute' &&
                !empty(substr($classMethod->getName(), 3, -9))
            ) {
                $attributeName = substr($classMethod->getName(), 3, -9);
                $output[$modelClass]['accessors'][] = ['default' => $attributeName, 'snake' => Illuminate\Support\Str::snake($attributeName), 'camel' => Illuminate\Support\Str::camel($attributeName)];
            }
        } catch (\Throwable $e) {
        }
    }
    sort($output[$modelClass]['attributes']);
    sort($output[$modelClass]['relations']);
}
echo json_encode($output);
