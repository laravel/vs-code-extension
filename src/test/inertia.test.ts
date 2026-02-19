import * as vscode from "vscode";
import { assertCompletions, assertHovers, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Inertia Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides inertia completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/inertia-helper.php"),
            ),
            lines: [
                "Inertia::render('welcome');",
                "Route::inertia('inertia-0', 'dashboard');",
                "Inertia::render('dashboard');",
            ],
            expects: ["welcome", "dashboard"],
        });
    });

    test("provides inertia links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/inertia-helper.php"),
            ),
            lines: [
                {
                    line: "Inertia::render('welcome');",
                    target: "resources/js/pages",
                },
                {
                    line: "Route::inertia('inertia-0', 'dashboard');",
                    argument: "dashboard",
                    target: "resources/js/pages",
                },
            ],
        });
    });

    test("provides inertia hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/inertia-helper.php"),
            ),
            lines: [
                {
                    line: "Inertia::render('welcome');",
                    contains: ["resources/js/pages"],
                },
            ],
        });
    });
});
