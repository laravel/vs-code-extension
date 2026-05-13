import * as cp from "child_process";
import * as vscode from "vscode";
import { config } from "./config";
import { info } from "./logger";
import {
    PhpEnvironment,
    phpEnvironments,
    phpEnvironmentsThatUseRelativePaths,
} from "./phpEnvironments";
import { showErrorPopup } from "./popup";
import { projectPath, relativePath } from "./project";

let defaultPhpCommand: string | null = null;
let phpEnvKey: PhpEnvironment | null = null;

const getPhpCommand = (): string => {
    const phpEnv = config<PhpEnvironment>("phpEnvironment", "auto");

    for (const [key, option] of Object.entries(phpEnvironments)) {
        if (phpEnv !== "auto" && phpEnv !== key) {
            continue;
        }

        if (!option.check || !option.command) {
            continue;
        }

        try {
            const checks = Array.isArray(option.check)
                ? option.check
                : [option.check];
            let check = checks.shift();
            let result = "";

            while (check) {
                info(`Checking ${key} PHP installation: ${check}`);

                result = cp
                    .execSync(check, {
                        cwd: projectPath(""),
                    })
                    .toString()
                    .trim()
                    .replace("{binaryPath}", result);

                check = checks.shift();
            }

            if (result !== "" && (!option.test || option.test(result))) {
                info(`Using ${key} PHP installation: ${result}`);

                phpEnvKey = key as PhpEnvironment;

                return option.command.replace("{binaryPath}", result);
            }
        } catch (e) {
            // ignore
        }
    }

    info("Falling back to system PHP installation");

    phpEnvKey = "local";

    return "php";
};

export const getPhpEnv = (): PhpEnvironment => {
    if (phpEnvKey === null) {
        defaultPhpCommand ??= getPhpCommand();
    }

    return phpEnvKey ?? "local";
};

export const isPhpEnv = (env: PhpEnvironment): boolean => false; // getPhpEnv() === env;

export const clearDefaultPhpCommand = () => {
    defaultPhpCommand = null;
};

const getDefaultPhpCommand = (): string => {
    defaultPhpCommand ??= getPhpCommand();

    return defaultPhpCommand;
};

export const fixFilePath = (path: string) => {
    if (phpEnvironmentsThatUseRelativePaths.includes(getPhpEnv())) {
        return relativePath(path);
    }

    return path;
};

export const getCommand = (code: string): string => {
    const commandTemplate = getCommandTemplate();

    return commandTemplate.includes("{code}")
        ? commandTemplate.replace("{code}", code)
        : `${commandTemplate} "${code}"`;
};

export const getCommandTemplate = (): string => {
    return config<string>("phpCommand", "") || getDefaultPhpCommand();
};

export const artisan = (
    command: string,
    workspaceFolder: string,
): Promise<string> => {
    const fullCommand = `${getCommand("artisan")} ${command}`.trim();

    return new Promise<string>((resolve, error) => {
        cp.exec(
            fullCommand,
            {
                cwd: workspaceFolder,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    return resolve(stdout);
                }

                const errorOutput = stderr.length > 0 ? stderr : stdout;

                showErrorPopup(
                    "Error:\n " + (command ?? "") + "\n\n" + errorOutput,
                );

                error(errorOutput);
            },
        );
    });
};

let artisanTerminal: vscode.Terminal | undefined;

export const runArtisanInTerminal = async (
    command: string,
    workspaceFolder: string,
): Promise<void> => {
    const fullCommand = `${getCommand("artisan")} ${command}`.trim();

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
