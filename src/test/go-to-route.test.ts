import * as assert from "assert";
import * as vscode from "vscode";
import { activateExtension, includesNormalized, withQuickPick } from "./helper";

suite("Go To Route Command Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("shows formatted routes and opens the selected handler", async () => {
        const picker = await withQuickPick({
            select: "GET settings/profile | profile.edit",
            trigger: () => vscode.commands.executeCommand("laravel.goToRoute"),
        });

        picker.assertIncludes("GET settings/profile | profile.edit");

        const activeEditor = vscode.window.activeTextEditor;

        assert.ok(
            includesNormalized(
                activeEditor?.document.uri.fsPath ?? "",
                "app/Http/Controllers/Settings/ProfileController.php",
            ),
            `Expected controller file to open, got ${activeEditor?.document.uri.fsPath}`,
        );
        assert.strictEqual(activeEditor?.selection.active.line, 19);
    });
});
