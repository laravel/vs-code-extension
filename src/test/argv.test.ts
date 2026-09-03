import * as assert from "assert";

import { argvToShellCommand } from "../support/argv";

suite("Shell Argument Test Suite", () => {
    test("invokes quoted executables in Windows PowerShell", () => {
        assert.strictEqual(
            argvToShellCommand(
                ["C:/Program Files/PHP/php.exe", "artisan"],
                "powershell",
            ),
            "& 'C:/Program Files/PHP/php.exe' artisan",
        );
    });

    test("invokes quoted executables in PowerShell 7", () => {
        assert.strictEqual(
            argvToShellCommand(
                ["C:/Program Files/PHP/php.exe", "artisan"],
                "pwsh",
            ),
            "& 'C:/Program Files/PHP/php.exe' artisan",
        );
    });

    test("escapes apostrophes in PowerShell arguments", () => {
        assert.strictEqual(
            argvToShellCommand(["php", "artisan", "O'Brien"], "pwsh"),
            "& php artisan 'O''Brien'",
        );
    });

    test("preserves POSIX apostrophe escaping", () => {
        assert.strictEqual(
            argvToShellCommand(["php", "artisan", "O'Brien"], "bash"),
            "php artisan 'O'\\''Brien'",
        );
    });

    test("quotes empty command prompt arguments", () => {
        assert.strictEqual(
            argvToShellCommand(["php", "artisan", ""], "cmd"),
            'php artisan ""',
        );
    });
});
