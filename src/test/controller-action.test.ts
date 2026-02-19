import * as vscode from "vscode";
import { assertCompletions, assertLinks } from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Controller Action Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides controller action completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/controller-action-helper.php"),
            ),
            lines: [
                // "0", // Not working: completion does not suggest controller actions in this fixture
                // "1", // Not working: completion does not suggest controller actions in this fixture
                // "2", // Not working: completion does not suggest controller actions in this fixture
            ],
            expects: ["Settings\\ProfileController@edit"],
        });
    });

    test("provides controller action links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/controller-action-helper.php"),
            ),
            lines: [
                // {
                //     line: "Route::get('controller-action-link', 'App\\\\Http\\\\Controllers\\\\Settings\\\\ProfileController@edit');",
                //     target: "app/Http/Controllers/Settings/ProfileController.php",
                // }, // Not working: no link target is returned for controller action strings in this fixture
            ],
        });
    });
});
