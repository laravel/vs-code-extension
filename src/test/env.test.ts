import * as vscode from "vscode";
import { assertCompletions, assertHovers, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Env Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides env completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/env-helper.php"),
            ),
            lines: [
                "env('APP_NAME');",
                "env('APP_ENV');",
                "Env::get('APP_ENV');",
            ],
            expects: ["APP_NAME", "APP_ENV"],
        });
    });

    test("provides env links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/env-helper.php"),
            ),
            lines: [
                { line: "env('APP_NAME');", target: "/.env" },
                { line: "Env::get('APP_ENV');", target: "/.env" },
            ],
        });
    });

    test("provides env hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/env-helper.php"),
            ),
            lines: [
                {
                    line: "env('APP_NAME');",
                    contains: ["Laravel"],
                },
            ],
        });
    });
});
