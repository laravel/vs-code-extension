# Official Laravel VS Code Extension

## Intro

This is the beta version of the official Laravel VS Code Extension. Below you'll find a list of features as well as a roadmap with features we will be integrating soon.

### Of Note

-   This extension will occasionally boot your app in the background to collect information about your app for use in autocompletion, linking, hovering, and diagnostics
-   When you first install the extension it will download a small binary to your machine, we use this binary for PHP parsing

A non-exhaustive list of features covered in the extension:

## App Bindings

```php
app('auth')
App::make('auth.driver')
```

-   Auto-completion
-   Links directly to binding
-   Warns when binding not found
-   Hoverable

## Assets

```php
asset('my-amazing-jpeg.png')
```

-   Auto-completion
-   Links directly to asset
-   Warns when asset not found

<!--
## Auth

```php
Gate::has('viewNova');
Gate::allows('viewNova');
// etc
```

-   Auto-completion
-   Links directly to gate
-   Warns when gate not found
-->

## Blade

-   Syntax highlighting

## Config

```php
config('broadcasting.connections.reverb.app_id');
Config::get('broadcasting.connections.reverb.app_id');
config()->string('broadcasting.connections.reverb.app_id');
```

-   Auto-completion
-   Links directly to config value
-   Warns when config not found
-   Hoverable

## Eloquent

-   Method auto-completion
-   Field auto-completion (e.g. `where` methods, `create`/`make`/object creation)
-   Relationship auto-completion (e.g. `with` method + `with` with array keys)
-   Sub-query auto-completion ( `with` with array keys + value as closure)

## Env

```php
env('REVERB_APP_ID');
Env::get('REVERB_APP_ID');
```

-   Auto-completion
-   Links directly to env value
-   Warns when env not found, offers quick fixes:
    -   Add to `.env`
    -   Copy value from `.env.example`
-   Hoverable

## Inertia

```php
inertia('Pages/Dashboard');
Inertier::render('Pages/Dashboard');
```

-   Auto-completion
-   Links directly to JS view
-   Warns when view not found, offers quick fixes:
    -   Create view
-   Hoverable

## Route

```php
route('dashboard');
signedRoute('dashboard');
Redirect::route('dashboard');
Redirect::signedRoute('dashboard');
URL::route('dashboard');
URL::signedRoute('dashboard');
Route::middleware('auth');
// etc
```

-   Auto-completion
-   Links directly to route definition
-   Warns when route not found
-   Hoverable

## Translation

```php
trans('auth.failed');
__('auth.failed');
Lang::has('auth.failed');
Lang::get('auth.failed');
// etc
```

-   Auto-completion
-   Links directly to translation
-   Warns when translation not found
-   Hoverable
-   Parameter auto-completion

## Validation

```php
Validator::validate($input, ['name' => 'required']);
request()->validate(['name' => 'required']);
request()->sometimes(['name' => 'required']);
// etc
```

-   Auto-completion for strings/arrays (not "|" just yet)

## View

```php
view('dashboard');
new Content(markdown: 'emails.big-sale');
```

-   Auto-completion
-   Links directly to Blade view
-   Warns when view not found, offers quick fixes:
    -   Create view
-   Hoverable

## On the Roadmap

-   Integration with VS Code test runner
-   Livewire support
-   Volt support
-   Pint support
