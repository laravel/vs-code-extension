## Introduction

The Laravel VS Code extension integrates the [Laravel LSP](https://github.com/laravel/lsp) server with Visual Studio Code, providing completions, hover information, diagnostics, links, and code actions for your PHP and Blade files.

The extension supports all Laravel versions currently listed under the [support policy](https://laravel.com/docs/releases#support-policy) and requires PHP 8.2 or later.

## LSP Documentation

Documentation for Laravel LSP can be found in the [Laravel LSP repository](https://github.com/laravel/lsp).

## Installation

Open the Extensions view in Visual Studio Code, search for "Laravel", and select **Install**.

## Configuration

No configuration is required by default.

To choose the PHP environment used by the Laravel LSP server, configure `Laravel.phpEnvironment` in your Visual Studio Code settings:

```json
{
    "Laravel.phpEnvironment": "sail"
}
```

For the full list of available configuration options, open the extension's settings in Visual Studio Code.

## Updates

The extension checks for Laravel LSP updates at most once every two hours. To force an update check without waiting, run `Laravel: Update LSP` from the command palette.

## Contributing

Thank you for considering contributing to the Laravel VS Code extension! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

Please review [our security policy](https://github.com/laravel/vs-code-extension/security/policy) on how to report security vulnerabilities.

## License

The Laravel VS Code extension is open-sourced software licensed under the [MIT license](https://opensource.org/license/mit).
