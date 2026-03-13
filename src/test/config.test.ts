import * as vscode from "vscode";
import {
    assertCompletions,
    assertDiagnostics,
    assertHovers,
    assertLinks,
} from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Config Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides config completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/config-helper.php"),
            ),
            lines: [
                "config('app.name');",
                "config('filesystems.default');",
                "Config::get('filesystems.default');",
            ],
            expects: ["app.name", "filesystems.default"],
        });
    });

    test("provides config links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/config-helper.php"),
            ),
            lines: [
                { line: "config('app.name');", target: "config/app.php" },
                {
                    line: "Config::get('filesystems.default');",
                    target: "config/filesystems.php",
                },
                {
                    line: "config('database.connections');",
                    target: "config/database.php",
                },
            ],
        });
    });

    test("provides config hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/config-helper.php"),
            ),
            lines: [
                {
                    line: "config('app.name');",
                    contains: ["config/app"],
                },
                {
                    line: "config('database.connections');",
                    contains: ["config/database"],
                },
            ],
        });
    });

    test("provides config diagnostics", async () => {
        await assertDiagnostics({
            doc: await vscode.workspace.openTextDocument(
                uri("app/config-helper.php"),
            ),
            lines: [
                {
                    line: "config('missing-config.entry');",
                    code: "config",
                    contains: ["missing-config.entry", "not found"],
                },
            ],
        });
    });
});
