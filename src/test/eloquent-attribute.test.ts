import * as vscode from "vscode";
import { assertCompletions } from "./assertions";
import { activateExtension, uri } from "./helper";

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

suite("Eloquent Attribute Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides eloquent attribute completions", async () => {
        const doc = await vscode.workspace.openTextDocument(
            uri("app/Models/User.php"),
        );

        await vscode.window.showTextDocument(doc, {
            preview: false,
            preserveFocus: false,
        });

        await sleep(500);

        await assertCompletions({
            doc,
            lines: [
                "#[Fillable(['name'])]",
                "#[Guarded(['id'])]",
                "#[Hidden(['password'])]",
                "#[Visible(['name'])]",
                "#[Appends(['name'])]",
            ],
            expects: ["name", "email", "password"],
        });
    });
});
