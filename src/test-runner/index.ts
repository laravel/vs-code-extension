import * as vscode from "vscode";

import { config } from "@src/support/config";
import { createFileWatcher } from "@src/support/fileWatcher";
import { updateExplorer } from "./explorer";
import { runHandler } from "./runner";

export const registerTestRunner = () => {
    if (!config("testRunner.enabled", true)) {
        return;
    }

    const controller = vscode.tests.createTestController(
        "laravel-tests",
        "Laravel Tests",
    );

    controller.createRunProfile(
        "Run Tests",
        vscode.TestRunProfileKind.Run,
        (request, token) => runHandler(controller, request, token),
        true,
    );

    controller.resolveHandler = async (item) => {
        if (!item) {
            await updateExplorer(controller);
        }
    };

    createFileWatcher(["tests/**/*"], () => updateExplorer(controller), [
        "create",
        "delete",
        "change",
    ]);

    updateExplorer(controller);
};
