import * as vscode from "vscode";

import { Command } from "@src/artisan/types.js";
import { buildArtisanCommand } from "@src/artisan/builder.js";
import { getPathFromOutput } from "@src/support/artisan.js";
import { artisan, runArtisanInTerminal } from "@src/support/php.js";
import { getWorkspaceFolders } from "@src/support/project.js";
import { openFileCommand } from "./index.js";

export const runArtisanCommand = async (
    command: Command,
    uri?: vscode.Uri | undefined,
) => {
    if (command.confirmation) {
        const choice = await vscode.window.showWarningMessage(
            command.confirmation.message,
            { modal: true },
            "Run",
        );

        if (choice !== "Run") {
            return;
        }
    }

    const workspaceFolder = getWorkspaceFolder(uri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Cannot detect active workspace");

        return;
    }

    uri ??= vscode.Uri.joinPath(workspaceFolder.uri);

    const artisanCommand = await buildArtisanCommand(
        command,
        uri,
        workspaceFolder,
    );

    if (!artisanCommand) {
        return;
    }

    if (command.runIn === "terminal") {
        runArtisanInTerminal(artisanCommand, workspaceFolder.uri.fsPath);

        return;
    }

    const output = await executeArtisanCommand(artisanCommand, workspaceFolder);

    if (!output) {
        return;
    }

    if (command.postRun === "openGeneratedFile") {
        openGeneratedFile(command, {
            output,
            workspaceFolder,
            uri,
        });
    }
};

const executeArtisanCommand = async (
    artisanCommand: string[],
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<string | undefined> => {
    const output = await artisan(artisanCommand, workspaceFolder.uri.fsPath);

    const error = output.match(/ERROR\s+(.*)/);

    if (error?.[1]) {
        vscode.window.showErrorMessage(error[1]);

        return;
    }

    return output;
};

const openGeneratedFile = (
    command: Command,
    result: {
        output: string;
        workspaceFolder: vscode.WorkspaceFolder;
        uri: vscode.Uri;
    },
) => {
    const outputPath = getPathFromOutput(
        result.output,
        command.name,
        result.workspaceFolder,
        result.uri,
    );

    if (!outputPath) {
        return;
    }

    openFileCommand(vscode.Uri.file(outputPath), 1, 1);
};

const getWorkspaceFolder = (
    uri: vscode.Uri | undefined,
): vscode.WorkspaceFolder | undefined => {
    if (uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (workspaceFolder) {
            return workspaceFolder;
        }
    }

    if (vscode.window.activeTextEditor) {
        const fileUri = vscode.window.activeTextEditor.document.uri;

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);

        if (workspaceFolder) {
            return workspaceFolder;
        }
    }

    return getWorkspaceFolders()?.[0];
};
