import * as vscode from "vscode";

import { buildArtisanCommand } from "@src/artisan/builder";
import { Command } from "@src/artisan/types";
import { getPathFromOutput } from "@src/support/artisan";
import { artisan, runArtisanInTerminal } from "@src/support/php";
import { getWorkspaceFolder } from "@src/support/workspace";
import { openFileCommand } from ".";

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
    artisanCommand: string,
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
