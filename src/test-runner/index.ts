import * as vscode from "vscode";

import { config } from "@src/support/config";
import { loadAndWatch } from "@src/support/fileWatcher";
import { updateExplorer } from "./explorer";
import { runHandler } from "./runner";

export const registerTestRunner = async (
    workspaceFolder: vscode.WorkspaceFolder,
) => {
    if (!config("testRunner.enabled", true)) {
        return;
    }

    const controller = vscode.tests.createTestController(
        `${workspaceFolder.name}-tests`,
        `${workspaceFolder.name} Tests`,
    );

    controller.createRunProfile(
        "Run Tests",
        vscode.TestRunProfileKind.Run,
        (request, token) =>
            runHandler(controller, request, token, workspaceFolder),
        true,
    );

    controller.resolveHandler = async (item) => {
        if (!item) {
            await updateExplorer(controller, workspaceFolder);
        }
    };

    loadAndWatch(
        (workspaceFolder) => {
            void updateExplorer(controller, workspaceFolder);
        },
        ["tests/**/*"],
        ["create", "delete", "change"],
        workspaceFolder,
    );
};
