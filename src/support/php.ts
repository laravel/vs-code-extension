import { getTemplate, TemplateName } from "@src/templates";
import * as cp from "child_process";
import * as fs from "fs";
import * as vscode from "vscode";
import { config } from "./config";
import { registerWatcher } from "./fileWatcher";
import { error, info } from "./logger";
import {
    PhpEnvironment,
    phpEnvironments,
    phpEnvironmentsThatUseRelativePaths,
} from "./phpEnvironments";
import { showErrorPopup } from "./popup";
import {
    getWorkspaceFolders,
    internalVendorPath,
    projectPath,
    projectPathExists,
    relativePath,
    setInternalVendorExists,
} from "./project";
import { md5 } from "./util";

const toTemplateVar = (str: string) => {
    const suffix = str === "output" ? ";" : "";

    return `__VSCODE_LARAVEL_${str.toUpperCase()}__${suffix}`;
};

let defaultPhpCommand: string | null = null;

const discoverFiles = new Map<string, string>();

let hasVendor = false;
let hasBootstrap = false;

export const initPhp = () => {
    hasVendor = projectPathExists("vendor/autoload.php");
    hasBootstrap = projectPathExists("bootstrap/app.php");
};

let phpEnvKey: PhpEnvironment | null = null;

export const initVendorWatchers = () => {
    // fs.readdirSync(internalVendorPath()).forEach((file) => {
    //     if (file.startsWith("discover-")) {
    //         fs.unlinkSync(internalVendorPath(file));
    //     }
    // });

    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(internalVendorPath(), "discover-*"),
        true,
        true,
    );

    watcher.onDidDelete((file) => {
        for (const [key, value] of discoverFiles) {
            if (value === file.fsPath) {
                discoverFiles.delete(key);
                break;
            }
        }
    });

    [internalVendorPath(), projectPath("vendor")].forEach((path) => {
        const watcher = vscode.workspace.createFileSystemWatcher(
            path,
            true,
            true,
        );

        watcher.onDidDelete(() => {
            setInternalVendorExists(false);
            discoverFiles.clear();
            hasVendor = false;
        });
    });

    const autoloadWatcher = vscode.workspace.createFileSystemWatcher(
        projectPath("vendor/autoload.php"),
        false,
        true,
    );

    autoloadWatcher.onDidCreate(() => {
        hasVendor = true;
    });

    autoloadWatcher.onDidDelete(() => {
        hasVendor = false;
    });

    registerWatcher(watcher);
    registerWatcher(autoloadWatcher);
};

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

export const template = (
    name: TemplateName,
    data: { [key: string]: string } = {},
) => {
    let templateString = getTemplate(name);

    for (const key in data) {
        templateString = templateString.replace(toTemplateVar(key), data[key]);
    }

    return templateString;
};

const getFormattedError = (
    error: string,
    description: string | null,
): string => {
    if (!description) {
        return error;
    }

    return `${description}\n\n${error}`;
};

export const runInLaravel = <T>(
    code: string,
    description: string | null = null,
    asJson: boolean = true,
    tryCount = 0,
): Promise<T> => {
    if (!hasVendor) {
        if (tryCount >= 30) {
            throw new Error("Vendor autoload not found, run composer install");
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(runInLaravel(code, description, asJson, tryCount + 1));
            }, 1000);
        });
    }

    if (!hasBootstrap) {
        throw new Error("Bootstrap file not found, not a Laravel project");
    }

    const command = template("bootstrapLaravel", {
        output: code,
    });

    return runPhp(command, description)
        .then((result: string) => {
            const regex = new RegExp(
                toTemplateVar("start_output") +
                    "(.*)" +
                    toTemplateVar("end_output"),
                "gs",
            );

            const out = regex.exec(result);

            if (out && out[1]) {
                return asJson ? JSON.parse(out[1]) : out[1];
            }

            throw new Error(result);
        })
        .catch((e) => {
            if (
                e.toString().includes("ParseError") ||
                e.toString().includes(toTemplateVar("STARTUP_ERROR"))
            ) {
                // If we it's a parse error or an app-wide error let's not show the popup,
                // probably just a momentary syntax error
                error(e);
                return;
            }

            showErrorPopup(getFormattedError(e.toString(), description));
        });
};

const fixFilePath = (path: string) => {
    if (phpEnvironmentsThatUseRelativePaths.includes(phpEnvKey!)) {
        return relativePath(path);
    }

    return path;
};

const getHashedFile = (code: string) => {
    if (discoverFiles.has(code)) {
        return fixFilePath(discoverFiles.get(code)!);
    }

    const hashedFile = internalVendorPath(`discover-${md5(code)}.php`);

    fs.writeFileSync(hashedFile, code);

    discoverFiles.set(code, hashedFile);

    return fixFilePath(hashedFile);
};

export const getCommandTemplate = (): string => {
    return config<string>("phpCommand", "") || getDefaultPhpCommand();
};

export const runPhp = (
    code: string,
    description: string | null = null,
): Promise<string> => {
    if (!code.startsWith("<?php")) {
        code = "<?php\n\n" + code;
    }

    const commandTemplate = getCommandTemplate();

    const hashedFile = getHashedFile(code);

    const command = commandTemplate.includes("{code}")
        ? commandTemplate.replace("{code}", hashedFile)
        : `${commandTemplate} "${hashedFile}"`;

    return new Promise<string>(function (resolve, error) {
        let result = "";

        const child = cp.spawn(command, {
            cwd: getWorkspaceFolders()[0]?.uri?.fsPath,
            shell: true,
        });

        child.stdout.on("data", (data) => {
            result += data;
        });

        child.stderr.on("data", (data) => {
            showErrorPopup(
                "Error:\n " + (description ?? "") + "\n\n" + data,
                command,
            );
            error(data);
        });

        child.on("close", (code) => {
            resolve(result);
        });
    });
};

export const artisan = (command: string): Promise<string> => {
    const fullCommand = projectPath("artisan") + " " + command;

    return new Promise<string>((resolve, error) => {
        cp.exec(
            fullCommand,
            {
                cwd: getWorkspaceFolders()[0]?.uri?.fsPath,
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
