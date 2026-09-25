import * as vscode from "vscode";

import { config } from "@src/support/config.js";
import { loadAndWatch } from "@src/support/fileWatcher.js";
import { updateExplorer } from "./explorer.js";
import { runHandler } from "./runner.js";

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

    loadAndWatch(
        () => {
            void updateExplorer(controller);
        },
        ["tests/**/*"],
        ["create", "delete", "change"],
    );
};
