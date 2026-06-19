import * as vscode from "vscode";

import { config } from "@src/support/config";
import { loadAndWatch } from "@src/support/fileWatcher";
import { getLaravelWorkspaceFolders } from "@src/support/workspace";
import { updateExplorer } from "./explorer";
import { runHandler } from "./runner";

export const registerTestRunner = () => {
    if (!config("testRunner.enabled", true)) {
        return;
    }

    getLaravelWorkspaceFolders().forEach((workspaceFolder) => {
        const controller = vscode.tests.createTestController(
            `${workspaceFolder.name}-tests`,
            `${workspaceFolder.name} Tests`,
        );

        controller.createRunProfile(
            "Run Tests",
            vscode.TestRunProfileKind.Run,
            (request, token) => runHandler(controller, request, token),
            true,
        );

        controller.resolveHandler = async (item) => {
            if (!item) {
                await updateExplorer(controller, workspaceFolder);
            }
        };

        loadAndWatch(
            () => {
                void updateExplorer(controller, workspaceFolder);
            },
            ["tests/**/*"],
            ["create", "delete", "change"],
            workspaceFolder,
        );
    });
};
