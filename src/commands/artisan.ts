import * as vscode from "vscode";

import { buildArtisanCommand } from "@src/artisan/builder";
import { Command } from "@src/artisan/types";
import { getPathFromOutput } from "@src/support/artisan";
import { artisan } from "@src/support/php";
import { getWorkspaceFolder } from "@src/support/workspace";
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
