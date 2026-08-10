import { getLaravelWorkspaceFolders } from "@src/support/project";
import * as vscode from "vscode";
import {
    completeLspBinaryUpdate,
    isUsingCustomLspBinary,
    LspBinaryUpdateResult,
    rollbackLspBinaryUpdate,
    updateLspBinary,
} from "./binary";
import { restartLspClient, startLspClient, stopLspClient } from "./client";

let lspUpdateQueue: Promise<void> = Promise.resolve();

export function checkForLspUpdate(
    context: vscode.ExtensionContext,
): Promise<void> {
    return enqueueLspUpdate(() => performLspUpdateCheck(context));
}

export async function forceLspUpdate(
    context: vscode.ExtensionContext,
    isLaravelProject: boolean,
): Promise<void> {
    if (!isLaravelProject) {
        vscode.window.showInformationMessage(
            "A Laravel project is required to update the Laravel LSP.",
        );
        return;
    }

    if (isUsingCustomLspBinary()) {
        vscode.window.showInformationMessage(
            "The Laravel LSP is managed by LARAVEL_LSP_BINARY_PATH and cannot be updated by the extension.",
        );
        return;
    }

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "Updating Laravel LSP",
                cancellable: false,
            },
            () =>
                enqueueLspUpdate(async () => {
                    let result: LspBinaryUpdateResult | undefined;

                    await Promise.all(
                        getLaravelWorkspaceFolders().map((workspaceFolder) =>
                            stopLspClient(workspaceFolder),
                        ),
                    );

                    try {
                        result = await updateLspBinary(context, {
                            force: true,
                        });

                        await Promise.all(
                            getLaravelWorkspaceFolders().map(
                                async (workspaceFolder) => {
                                    const updatedClient =
                                        await startLspClient(workspaceFolder);

                                    if (!updatedClient) {
                                        throw new Error(
                                            `The updated Laravel LSP did not start for ${workspaceFolder.name}`,
                                        );
                                    }
                                },
                            ),
                        );
                    } catch (error) {
                        if (result?.status === "updated") {
                            await rollbackLspBinaryUpdate(context, result);
                        }

                        await Promise.all(
                            getLaravelWorkspaceFolders().map(
                                (workspaceFolder) =>
                                    startLspClient(workspaceFolder),
                            ),
                        );

                        throw error;
                    }

                    try {
                        await completeLspBinaryUpdate(context, result);
                    } catch (error) {
                        console.error(
                            "Failed to clean up old Laravel LSP binaries:",
                            error,
                        );
                    }
                }),
        );

        vscode.window.showInformationMessage(
            "Laravel LSP updated successfully.",
        );
    } catch (error) {
        console.error("Failed to update the Laravel LSP:", error);
        vscode.window.showErrorMessage(
            `Failed to update the Laravel LSP: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

function enqueueLspUpdate(operation: () => Promise<void>): Promise<void> {
    const update = lspUpdateQueue.then(operation);

    lspUpdateQueue = update.catch(() => undefined);

    return update;
}

async function performLspUpdateCheck(
    context: vscode.ExtensionContext,
): Promise<void> {
    let result: LspBinaryUpdateResult;

    try {
        result = await updateLspBinary(context);
    } catch (error) {
        console.error("Failed to check for a Laravel LSP update:", error);
        return;
    }

    if (result.status !== "updated") {
        return;
    }

    try {
        const restartedClient = await restartLspClient();

        if (!restartedClient) {
            throw new Error("The updated Laravel LSP did not start");
        }
    } catch (error) {
        console.error("Failed to start the updated Laravel LSP:", error);

        try {
            await rollbackLspBinaryUpdate(context, result);
            await restartLspClient();
        } catch (rollbackError) {
            console.error(
                "Failed to restore the previous Laravel LSP:",
                rollbackError,
            );
        }

        return;
    }

    try {
        await completeLspBinaryUpdate(context, result);
    } catch (error) {
        console.error("Failed to clean up old Laravel LSP binaries:", error);
    }
}
