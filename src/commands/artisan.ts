import * as vscode from "vscode";

import { Command } from "@src/artisan/types";
import { buildArtisanCommand } from "@src/artisan/builder";
import { artisan } from "@src/support/php";
import { getPathFromOutput } from "@src/support/artisan";
import { getWorkspaceFolders } from "@src/support/project";
import { openFileCommand } from ".";

export const runArtisanMakeCommand = async (
    command: Command,
    uri?: vscode.Uri | undefined,
) => {
    const result = await runArtisanCommand(command, uri);

    if (!result) {
        return;
    }

    const outputPath = getPathFromOutput(
        result.output,
        command.name,
        result.workspaceFolder,
        result.uri,
    );

    if (outputPath) {
        openFileCommand(vscode.Uri.file(outputPath), 1, 1);
    }
};

export const runArtisanCommand = async (
    command: Command,
    uri?: vscode.Uri | undefined,
) => {
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

    const output = await artisan(artisanCommand, workspaceFolder.uri.fsPath);

    const error = output.match(/ERROR\s+(.*)/);

    if (error?.[1]) {
        vscode.window.showErrorMessage(error[1]);

        return;
    }

    return { output, workspaceFolder, uri };
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
