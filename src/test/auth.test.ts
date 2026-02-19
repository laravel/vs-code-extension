import * as vscode from "vscode";
import { assertCompletions, assertHovers, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Auth Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides auth completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/auth-helper.php"),
            ),
            lines: [
                "Gate::has('test-auth');",
                "Gate::has('test-auth-alt');",
                "Gate::has('test-auth');",
            ],
            expects: ["test-auth"],
        });
    });

    test("provides auth links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/auth-helper.php"),
            ),
            lines: [
                {
                    line: "Gate::has('test-auth');",
                    target: "app/Providers/AuthTestServiceProvider.php",
                },
                {
                    line: "Gate::has('test-auth-alt');",
                    target: "app/Providers/AuthTestServiceProvider.php",
                },
            ],
        });
    });

    test("provides auth hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/auth-helper.php"),
            ),
            lines: [
                {
                    line: "Gate::has('test-auth');",
                    contains: ["AuthTestServiceProvider"],
                },
            ],
        });
    });
});
