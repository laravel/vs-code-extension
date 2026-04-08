import * as assert from "assert";
import * as vscode from "vscode";
import { activateExtension, sleep } from "./helper";

suite("Go To Route Command Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("shows formatted routes and opens the selected handler", async () => {
        const originalShowQuickPick = vscode.window.showQuickPick;
        let labels: string[] = [];

        try {
            (vscode.window as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick =
                (async (
                    items:
                        | readonly vscode.QuickPickItem[]
                        | Thenable<readonly vscode.QuickPickItem[]>,
                ) => {
                    const pickerItems = await Promise.resolve(items);

                    labels = pickerItems.map((item) => item.label);

                    return (
                        pickerItems.find(
                            (item) =>
                                item.label ===
                                "GET settings/profile | profile.edit",
                        ) ?? undefined
                    );
                }) as unknown as typeof vscode.window.showQuickPick;

            await vscode.commands.executeCommand("laravel.goToRoute");

            assert.ok(
                labels.includes("GET settings/profile | profile.edit"),
                `Expected formatted route label, got ${labels.join(", ")}`,
            );

            let activeEditor = vscode.window.activeTextEditor;

            for (let tryCount = 0; tryCount < 20; tryCount++) {
                if (
                    activeEditor?.document.uri.fsPath.endsWith(
                        "app/Http/Controllers/Settings/ProfileController.php",
                    )
                ) {
                    break;
                }

                await sleep(100);
                activeEditor = vscode.window.activeTextEditor;
            }

            assert.ok(activeEditor, "Expected an active editor after navigation");
            assert.ok(
                activeEditor?.document.uri.fsPath.endsWith(
                    "app/Http/Controllers/Settings/ProfileController.php",
                ),
                `Expected controller file to open, got ${activeEditor?.document.uri.fsPath}`,
            );
            assert.strictEqual(activeEditor?.selection.active.line, 19);
        } finally {
            (vscode.window as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick =
                originalShowQuickPick;
        }
    });
});
