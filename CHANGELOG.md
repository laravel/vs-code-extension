# Change Log

All notable changes to the Laravel extension will be documented in this file.

## [Unreleased]

- Improved Gate/Policy support ([#254](https://github.com/laravel/vs-code-extension/pull/254))

## [0.1.19]

- Added optional test func to PHP auto detection ([#219](https://github.com/laravel/vs-code-extension/pull/219))
- Use 2MB buffer instead of 1MB ([#211](https://github.com/laravel/vs-code-extension/pull/211))
- Added CONTRIBUTING.md to help people that want to contribute to the extension
- Include debug info when copying error ([#250](https://github.com/laravel/vs-code-extension/pull/250))
- Stop using File::json for JSON translations ([#249](https://github.com/laravel/vs-code-extension/pull/249))
- Fix inertia relative path ([#246](https://github.com/laravel/vs-code-extension/pull/246))
- Fix relative asset paths ([#245](https://github.com/laravel/vs-code-extension/pull/245))
- Don't re-document existing Eloquent docblocks ([#235](https://github.com/laravel/vs-code-extension/pull/235))
- Dispose file watchers on deactivate ([#234](https://github.com/laravel/vs-code-extension/pull/234))
- More Eloquent column mapping types ([#233](https://github.com/laravel/vs-code-extension/pull/233))

## [0.1.18]

### Fixed

- Null logger for mini PHP scripts ([#199](https://github.com/laravel/vs-code-extension/pull/199))
- App Bindings: Make sure reflected class is not null ([#198](https://github.com/laravel/vs-code-extension/pull/198))
- ScopedPropertyAccessExpressionParser improvements ([#8](https://github.com/laravel/vs-code-php-parser-cli/pull/8))
- Check `isAutoCompleting` before firing it ([#7](https://github.com/laravel/vs-code-php-parser-cli/pull/7))
- Make sure `ClosureThis` is not null before we use it in `auth` mini script ([#200](https://github.com/laravel/vs-code-extension/pull/200))
- Handle string concatenation parsing ([#9](https://github.com/laravel/vs-code-php-parser-cli/pull/9))
- Improved Blade autocomplete, linking, hovering, and diagnostics for echo statements ([#10](https://github.com/laravel/vs-code-php-parser-cli/pull/10), [#205](https://github.com/laravel/vs-code-extension/pull/205))

## [0.1.17]

### Added

- Allow configuration of project base path ([#184](https://github.com/laravel/vs-code-extension/pull/184))

### Fixed

- Fix confusing "PHP Command" setting ([#187](https://github.com/laravel/vs-code-extension/pull/187))
- Fix for missing translation "path" property ([#186](https://github.com/laravel/vs-code-extension/pull/186))
- Fix binary permissions cross platform ([#183](https://github.com/laravel/vs-code-extension/pull/183))
- Increase binary download timeout to 60s ([#182](https://github.com/laravel/vs-code-extension/pull/182))

## [0.1.16]

### Added

- PHP Environment setting. Specify your local environment via a list of common local setups.
- Broadened the scope of `config` values to include top level files and top-level array keys

### Fixed

- Auto-detection of Sail and running PHP scripts via Sail
- Bug where second parameter of `config()` was autocompleting, linking, hovering, and validating
- Removed hardcoded `env` values from `launch.json` to allow users to contribute more easily
- File watcher paths as configured by `config/inertia.php`
- Missing Inertia views quick fix now respects the paths as configured by `config/inertia.php`
- Hovering and linking for Windows users with incorrect filepaths
- Removed error popups when the codebase had a parser error (during active editing)

## [0.1.15]

- Fixed issue with executing binary on Windows path with spaces
- Repo file watchers are now debounced to prevent CPU from spiking
- Extension should now output cleaner errors from mini scripts so that future issues will be easier to debug

## [0.1.14]

- Fixed fallback for running PHP code (mentioned in 0.1.13 as a breaking change). The note in the last changelog was incorrect: the new PHP Command setting should just read `php`, meaning the file will just be added to the end of the command.

## [0.1.13]

- Initial Windows support
- Fixed nullable param for translations template for PHP 8.4
- Fixed undefined GLOB_BRACE for translations template
- Fix for Eloquent model info when `phpDocumentor` wasn't installed
- Fix for handling newline characters in JSON response ([#31](https://github.com/laravel/vs-code-extension/pull/31))
- Remove `.github` from bundle ([#29](https://github.com/laravel/vs-code-extension/pull/29))
- Inspired by [#20](https://github.com/laravel/vs-code-extension/pull/20), Inertia paths are now read from the existing PHP config in the project
- **Breaking**: The setting for PHP Command is now changed to run a file, not inline code. Previously this would have looked like this: `php -r "{code}"` but should now look like this `php "{code}"`

## [0.1.12]

- Now fetching OS/arch specific binaries for Mac and Linux (Windows coming soon)
- Fixed translation loading when there were _a lot_ of translations
- Fixed an issue regarding full name resolution for scoped property access

## [0.1.11]

- No significant changes

## [0.1.10]

- Updated icon
- Fixed translation file path display
- Fixed detection of helper methods in parser (e.g. `config()`, `redirect()`, etc)
- Made downloaded binary ~30% smaller

## [0.1.9]

- Fixed parsing for `new` anonymous classes (i.e. migrations)
- Fixed parsing for regular function declarations

## [0.1.8]

- Bugfix for (really) large `detect` responses
- Autocomplete for `view` related items orders by non-vendor views first
- Fixed bug for searching for views in non-directories
- Better support for earlier versions of Laravel (fixes for config and translation loading)
- If extension cannot load, give specific reason
- Support for linking in path helpers:
    - `base_path`
    - `resource_path`
    - `config_path`
    - `app_path`
    - `database_path`
    - `lang_path`
    - `public_path`
    - `storage_path`

## [0.1.7]

- Facade aliases are now considered
- Blade linking, hovering, and diagnostics are improved
- Fixed an error where variables were not consistently resolved

## [0.1.6]

- Fixed bug where we weren't restricting diagnostics to only PHP files
- Added timeout to parsing processes

## [0.1.5]

- Remove external dependency on file downloader extension
- Removed keybindings and commands for test runner

## [0.1.4]

- Aligned items you can autocomplete with linkable, hoverable, and diagnostic-able items
- Created settings for opting in and out of auto completion

## [0.1.3]

- Performance improvements
- Remove tests integration (for now)
- Added `to_route` completion
- Added `redirect()` helper chaining for hovering, linking, and diagnostics
