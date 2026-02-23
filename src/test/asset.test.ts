import * as vscode from "vscode";
import {
    assertCompletions,
    assertDiagnostics,
    assertLinks,
} from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Asset Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides asset completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/asset-helper.php"),
            ),
            lines: ["asset('robots.txt');", "asset('favicon.svg');"],
            expects: ["robots.txt", "favicon.svg"],
        });
    });

    test("provides links for assets", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/asset-helper.php"),
            ),
            lines: [
                {
                    line: "asset('robots.txt');",
                    target: "public/robots.txt",
                },
                {
                    line: "asset('favicon.svg');",
                    target: "public/favicon.svg",
                },
            ],
        });
    });

    test("provides asset diagnostics", async () => {
        await assertDiagnostics({
            doc: await vscode.workspace.openTextDocument(
                uri("app/asset-helper.php"),
            ),
            lines: [
                {
                    line: "asset('missing-asset.txt');",
                    code: "asset",
                    contains: ["missing-asset.txt", "not found"],
                },
            ],
        });
    });
});
