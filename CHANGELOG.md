# Change Log

All notable changes to the Laravel extension will be documented in this file.

## [0.1.10]

-   Updated icon
-   Fixed translation file path display
-   Fixed detection of helper methods in parser (e.g. `config()`, `redirect()`, etc)
-   Made downloaded binary ~30% smaller

## [0.1.9]

-   Fixed parsing for `new` anonymous classes (i.e. migrations)
-   Fixed parsing for regular function declarations

## [0.1.8]

-   Bugfix for (really) large `detect` responses
-   Autocomplete for `view` related items orders by non-vendor views first
-   Fixed bug for searching for views in non-directories
-   Better support for earlier versions of Laravel (fixes for config and translation loading)
-   If extension cannot load, give specific reason
-   Support for linking in path helpers:
    -   `base_path`
    -   `resource_path`
    -   `config_path`
    -   `app_path`
    -   `database_path`
    -   `lang_path`
    -   `public_path`
    -   `storage_path`

## [0.1.7]

-   Facade aliases are now considered
-   Blade linking, hovering, and diagnostics are improved
-   Fixed an error where variables were not consistently resolved

## [0.1.6]

-   Fixed bug where we weren't restricting diagnostics to only PHP files
-   Added timeout to parsing processes

## [0.1.5]

-   Remove external dependency on file downloader extension
-   Removed keybindings and commands for test runner

## [0.1.4]

-   Aligned items you can autocomplete with linkable, hoverable, and diagnostic-able items
-   Created settings for opting in and out of auto completion

## [0.1.3]

-   Performance improvements
-   Remove tests integration (for now)
-   Added `to_route` completion
-   Added `redirect()` helper chaining for hovering, linking, and diagnostics
