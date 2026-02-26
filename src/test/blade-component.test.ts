import * as assert from "assert";
import * as vscode from "vscode";
import { assertHovers, assertLinks } from "./assertions";
import { activateExtension, getCompletions, uri } from "./helper";

suite("Blade Component Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides blade component completions", async () => {
        const doc = await vscode.workspace.openTextDocument(
            uri("resources/views/blade-component-helper.blade.php"),
        );

        const index = doc.getText().indexOf("<x-");

        if (index === -1) {
            assert.fail("Could not find blade component completion marker");
        }

        const completions = await getCompletions(
            doc,
            doc.positionAt(index + 3),
        );
        const names = completions.items.map((item) =>
            typeof item.label === "string" ? item.label : item.label.label,
        );

        assert.ok(
            names.includes("x-test-alert"),
            `Should suggest 'x-test-alert'. Got: ${names.join(", ")}`,
        );
    });

    test("provides blade component links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("resources/views/blade-component-helper.blade.php"),
            ),
            lines: [
                {
                    line: "<x-test-alert>",
                    argument: "test-alert",
                    target: "resources/views/components/test-alert.blade.php",
                },
            ],
        });
    });

    test("provides blade component hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("resources/views/blade-component-helper.blade.php"),
            ),
            lines: [
                {
                    line: "<x-test-alert>",
                    argument: "test-alert",
                    contains: [
                        "resources/views/components/test-alert.blade.php",
                    ],
                },
            ],
        });
    });
});
