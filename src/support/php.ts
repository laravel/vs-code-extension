import * as cp from "child_process";
import * as vscode from "vscode";
import { getPhpCommand as getPhpCommandArgv } from "../lsp/php";
import { argvToShellCommand } from "./argv";
import { config } from "./config";
import {
    PhpEnvironment,
    phpEnvironmentsThatUseRelativePaths,
} from "./phpEnvironments";
import { showErrorPopup } from "./popup";
import { relativePath } from "./project";

export const fixFilePath = (path: string) => {
    const phpEnv = config<PhpEnvironment>("phpEnvironment", "auto");

    if (phpEnvironmentsThatUseRelativePaths.includes(phpEnv)) {
        return relativePath(path);
    }

    return path;
};

const getArtisanCommand = (command: string[]): string[] => [
    ...getPhpCommandArgv(),
    "artisan",
    ...command,
];

export const artisan = (
    command: string[],
    workspaceFolder: string,
): Promise<string> => {
    const [executable, ...args] = getArtisanCommand(command);

    return new Promise<string>((resolve, error) => {
        cp.execFile(
            executable,
            args,
            {
                cwd: workspaceFolder,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    return resolve(stdout);
                }

                const errorOutput = stderr.length > 0 ? stderr : stdout;

                showErrorPopup(
                    "Error:\n " +
                        argvToShellCommand(getArtisanCommand(command)) +
                        "\n\n" +
                        errorOutput,
                );

                error(errorOutput);
            },
        );
    });
};

let artisanTerminal: vscode.Terminal | undefined;

export const runArtisanInTerminal = async (
    command: string[],
    workspaceFolder: string,
): Promise<void> => {
    const fullCommand = argvToShellCommand(getArtisanCommand(command));

    if (
        !artisanTerminal ||
        !vscode.window.terminals.includes(artisanTerminal)
    ) {
        artisanTerminal = vscode.window.createTerminal({
            name: "Laravel Artisan",
            cwd: workspaceFolder,
        });
    }

    artisanTerminal.show();
    await vscode.commands.executeCommand("workbench.action.terminal.clear");
    artisanTerminal.sendText(fullCommand, true);
};
