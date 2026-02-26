import * as assert from "assert";
import * as vscode from "vscode";
import {
    assertCompletions,
    assertDiagnostics,
    assertLinks,
} from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Storage Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides storage completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/storage-helper.php"),
            ),
            lines: [
                "Storage::disk('local');",
                "Storage::disk('public');",
                "Storage::fake('public');",
            ],
            expects: ["local", "public"],
        });
    });

    test("provides storage links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/storage-helper.php"),
            ),
            lines: [
                {
                    line: "Storage::disk('local');",
                    target: "config/filesystems.php",
                },
                {
                    line: "Storage::fake('public');",
                    target: "config/filesystems.php",
                },
            ],
        });
    });

    test("provides storage diagnostics", async () => {
        await assertDiagnostics({
            doc: await vscode.workspace.openTextDocument(
                uri("app/storage-helper.php"),
            ),
            lines: [
                {
                    line: "Storage::disk('missing');",
                    code: "storage_disk",
                    contains: ["missing", "not found"],
                },
            ],
        });
    });
});
