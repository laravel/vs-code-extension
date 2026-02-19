import * as vscode from "vscode";
import { assertCompletions, assertHovers, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("View Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides view completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/view-helper.php"),
            ),
            lines: [
                "view('app');",
                "View::make('app');",
                "Route::view('view-link', 'app');",
            ],
            expects: ["app"],
        });
    });

    test("provides view links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/view-helper.php"),
            ),
            lines: [
                {
                    line: "view('app');",
                    target: "resources/views/app.blade.php",
                },
                {
                    line: "Route::view('view-link', 'app');",
                    argument: "app",
                    target: "resources/views/app.blade.php",
                },
            ],
        });
    });

    test("provides view hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/view-helper.php"),
            ),
            lines: [
                {
                    line: "view('app');",
                    contains: ["resources/views/app.blade.php"],
                },
            ],
        });
    });
});
