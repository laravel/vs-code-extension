import * as vscode from "vscode";
import { assertCompletions, assertHovers, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Middleware Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides middleware completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/middleware-helper.php"),
            ),
            lines: [
                "Route::middleware('test.middleware')->get('middleware-link', fn () => null);",
                "Route::withoutMiddleware('test.middleware')->get('middleware-1', fn () => null);",
                "Route::middleware('test.middleware')->get('middleware-2', fn () => null);",
            ],
            expects: ["test.middleware"],
        });
    });

    test("provides middleware links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/middleware-helper.php"),
            ),
            lines: [
                {
                    line: "Route::middleware('test.middleware')->get('middleware-link', fn () => null);",
                    target: "app/Http/Middleware/HandleAppearance.php",
                },
                {
                    line: "Route::withoutMiddleware(['test.middleware'])->get('middleware-link-2', fn () => null);",
                    target: "app/Http/Middleware/HandleAppearance.php",
                },
            ],
        });
    });

    test("provides middleware hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/middleware-helper.php"),
            ),
            lines: [
                {
                    line: "Route::middleware('test.middleware')->get('middleware-link', fn () => null);",
                    contains: ["HandleAppearance.php"],
                },
            ],
        });
    });
});
