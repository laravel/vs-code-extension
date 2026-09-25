import * as vscode from "vscode";
import { assertCompletions } from "./assertions.js";
import { activateExtension, uri } from "./helper.js";

suite("Parser Special Characters Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("parses code with shell metacharacters without errors", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/parser-special-chars.php"),
            ),
            lines: ["config('app.name');"],
            expects: ["app.name"],
        });
    });
});
