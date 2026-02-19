import * as vscode from "vscode";
import { assertCompletions, assertHovers, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Translation Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides translation completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/translation-helper.php"),
            ),
            lines: [
                "__('messages.welcome');",
                "trans('messages.goodbye');",
                "trans_choice('messages.welcome', 1);",
            ],
            expects: ["messages.welcome", "messages.goodbye"],
        });
    });

    test("provides translation links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/translation-helper.php"),
            ),
            lines: [
                {
                    line: "__('messages.welcome');",
                    target: "lang/en/messages.php",
                },
            ],
        });
    });

    test("provides translation hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/translation-helper.php"),
            ),
            lines: [
                {
                    line: "__('messages.welcome');",
                    contains: ["Welcome test message", "lang/en/messages.php"],
                },
            ],
        });
    });
});
