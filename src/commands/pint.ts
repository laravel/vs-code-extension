import { fixFilePath, getCommand } from "@src/support/php";
import {
    statusBarError,
    statusBarSuccess,
    statusBarWorking,
} from "@src/support/statusBar";
import * as cp from "child_process";
import * as vscode from "vscode";
import { commandName } from ".";
import { config } from "../support/config";
import { showErrorPopup } from "../support/popup";
import {
    getWorkspaceFolders,
    projectPath,
    projectPathExists,
} from "../support/project";

export const pintCommands = {
    all: commandName("laravel.pint.run"),
    currentFile: commandName("laravel.pint.runOnCurrentFile"),
    dirtyFiles: commandName("laravel.pint.runOnDirtyFiles"),
};

const runPintCommand = (
    args: string = "",
    showSuccessMessage: boolean = true,
): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        // Check if pint exists in vendor/bin
        const pintPath = projectPath("vendor/bin/pint");

        if (!projectPathExists("vendor/bin/pint")) {
            const errorMessage =
                "Pint not found. Make sure Laravel Pint is installed in your project.";
            showErrorPopup(errorMessage);
            reject(new Error(errorMessage));
            return;
        }

        const php = getCommand();

        // Without php at the beginning, it won't work on Windows
        const command = `"${php}" "${pintPath}" ${args}`.trim();

        cp.exec(
            command,
            {
                cwd: getWorkspaceFolders()[0]?.uri?.fsPath,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    if (showSuccessMessage) {
                        statusBarSuccess("Pint completed successfully!");
                    }

                    return resolve(stdout);
                }

                const errorOutput = stderr.length > 0 ? stderr : stdout;

                if (!errorOutput.includes("No changes")) {
                    showErrorPopup("Pint Error:\n\n" + errorOutput);
                    reject(new Error(errorOutput));
                } else {
                    resolve(stdout);
                }
            },
        );
    });
};

export const runPint = () => {
    statusBarWorking("Running Pint...");
    runPintCommand();
};

export const runPintOnCurrentFile = () => {
    const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;

    if (!filePath) {
        statusBarError("No file selected");
        return;
    }

    statusBarWorking("Running Pint on current file...");
    runPintCommand(fixFilePath(filePath));
};

export const runPintOnDirtyFiles = () => {
    statusBarWorking("Running Pint on dirty files...");
    runPintCommand("--dirty");
};

const runPintOnFile = (
    filePath: string,
    showSuccessMessage: boolean = true,
): Promise<string> => {
    return runPintCommand(`"${fixFilePath(filePath)}"`, showSuccessMessage);
};

export const runPintOnSave = (document: vscode.TextDocument) => {
    if (!config("pint.runOnSave", false)) {
        return;
    }

    if (document.languageId !== "php" && document.languageId !== "blade") {
        return;
    }

    if (
        !document.uri.fsPath.startsWith(
            getWorkspaceFolders()[0]?.uri?.fsPath || "",
        )
    ) {
        return;
    }

    runPintOnFile(document.uri.fsPath, false);
};

export class PintEditProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits() {
        runPintOnCurrentFile();

        return [];
    }
}
