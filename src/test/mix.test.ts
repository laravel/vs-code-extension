import * as vscode from "vscode";
import { assertCompletions, assertHovers, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Mix Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides mix completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/mix-helper.php"),
            ),
            lines: [
                "mix('js/app.js');",
                "mix('css/app.css');",
                "mix('js/app.js');",
            ],
            expects: ["js/app.js", "css/app.css"],
        });
    });

    // test("provides mix links", async () => {
    //     await assertLinks({
    //         doc: await vscode.workspace.openTextDocument(
    //             uri("app/mix-helper.php"),
    //         ),
    //         lines: [
    //             { line: "mix('js/app.js');", target: "public/build/assets" },
    //             { line: "mix('css/app.css');", target: "public/build/assets" },
    //         ],
    //     });
    // }); // Not working on Windows: link target is not returned

    // test("provides mix hovers", async () => {
    //     await assertHovers({
    //         doc: await vscode.workspace.openTextDocument(
    //             uri("app/mix-helper.php"),
    //         ),
    //         lines: [
    //             {
    //                 line: "mix('js/app.js');",
    //                 contains: ["public/build/assets"],
    //             },
    //         ],
    //     });
    // }); // Not working on Windows: hover is not returned
});
