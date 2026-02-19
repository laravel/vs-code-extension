import * as vscode from "vscode";
import { assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Paths Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides links for helper paths", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/paths-helper.php"),
            ),
            lines: [
                {
                    line: "base_path('composer.json');",
                    target: "composer.json",
                },
                {
                    line: "resource_path('views/app.blade.php');",
                    target: "resources/views/app.blade.php",
                },
                { line: "config_path('app.php');", target: "config/app.php" },
                {
                    line: "public_path('robots.txt');",
                    target: "public/robots.txt",
                },
            ],
        });
    });
});
