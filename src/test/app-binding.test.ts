import * as vscode from "vscode";
import {
    assertCompletions,
    assertDiagnostics,
    assertHovers,
    assertLinks,
} from "./assertions";
import { activateExtension, uri } from "./helper";

suite("App Binding Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides app binding completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/app-binding.php"),
            ),
            lines: [
                "app('test.binding');",
                "app()->make('test.binding.alt');",
                "app()->bound('test.binding');",
                "App::make('test.binding.alt');",
                "App::bound('test.binding');",
                "App::isShared('test.binding.alt');",
            ],
            expects: ["test.binding", "test.binding.alt"],
        });
    });

    test("provides links for app bindings", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/app-binding.php"),
            ),
            lines: [
                {
                    line: "app('test.binding');",
                    target: "app/Providers/AppBindingTestServiceProvider.php",
                },
                {
                    line: "app()->make('test.binding.alt');",
                    target: "app/Providers/AppBindingTestServiceProvider.php",
                },
                {
                    line: "app()->bound('test.binding');",
                    target: "app/Providers/AppBindingTestServiceProvider.php",
                },
                {
                    line: "App::make('test.binding.alt');",
                    target: "app/Providers/AppBindingTestServiceProvider.php",
                },
                {
                    line: "App::bound('test.binding');",
                    target: "app/Providers/AppBindingTestServiceProvider.php",
                },
                {
                    line: "App::isShared('test.binding.alt');",
                    target: "app/Providers/AppBindingTestServiceProvider.php",
                },
            ],
        });
    });

    test("provides app binding hover details", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/app-binding.php"),
            ),
            lines: [
                {
                    line: "app('test.binding');",
                    contains: [
                        "AppBindingTestServiceProvider",
                        "app/Providers/AppBindingTestServiceProvider.php",
                    ],
                },
                {
                    line: "app()->make('test.binding.alt');",
                    contains: [
                        "AppBindingTestServiceProvider",
                        "app/Providers/AppBindingTestServiceProvider.php",
                    ],
                },
            ],
        });
    });

    test("provides app binding diagnostics", async () => {
        await assertDiagnostics({
            doc: await vscode.workspace.openTextDocument(
                uri("app/app-binding.php"),
            ),
            lines: [
                {
                    line: "app('missing.binding');",
                    code: "appBinding",
                    contains: ["missing.binding", "not found"],
                },
            ],
        });
    });
});
