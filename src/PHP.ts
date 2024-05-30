import * as fs from "fs";
import * as vscode from "vscode";
import Helpers from "./helpers";
import Logger from "./Logger";
import * as os from "os";
import * as cp from "child_process";

const templates: { [key: string]: string } = {};

const toTemplateVar = (str: string) => {
    return `__VSCODE_LARAVEL_${str.toUpperCase()}__`;
};

const getTemplate = (name: string) => {
    if (templates[name]) {
        return templates[name];
    }

    templates[name] = fs.readFileSync(
        `${__dirname}/templates/${name}.template`,
        "utf8",
    );

    return templates[name];
};

export const template = (
    name: string,
    data: { [key: string]: string } = {},
) => {
    let templateString = getTemplate(name);

    for (const key in data) {
        templateString = templateString.replace(toTemplateVar(key), data[key]);
    }

    return templateString;
};

export const runInLaravel = (
    code: string,
    description: string | null = null,
): Promise<string | void> => {
    code = code.replace(/(?:\r\n|\r|\n)/g, " ");
    if (
        !fs.existsSync(Helpers.projectPath("vendor/autoload.php")) ||
        !fs.existsSync(Helpers.projectPath("bootstrap/app.php"))
    ) {
        return new Promise((resolve, error) => resolve(""));
    }

    const command = template("bootstrap-laravel", {
        output: code,
        vendor_autoload_path: Helpers.projectPath("vendor/autoload.php", true),
        bootstrap_path: Helpers.projectPath("bootstrap/app.php", true),
    });

    // Logger.channel?.info(command);

    return runPhp(command, description)
        .then((result: string) => {
            const regex = new RegExp(
                toTemplateVar("start_output") +
                    "(.*)" +
                    toTemplateVar("end_output"),
                "g",
            );

            const out = regex.exec(result);

            if (out) {
                return out[1];
            }

            // TODO: Fix this
            Logger.channel?.error(
                "Parse Error:\n " + (description ?? "") + "\n\n" + result,
            );

            throw new Error("No output found");
        })
        .catch((error) => {
            Logger.channel?.error(command);

            Helpers.showErrorPopup();
        });
};

export const runPhp = (
    code: string,
    description: string | null = null,
): Promise<string> => {
    // TODO: Make sure all of these replacements are necessary
    // (also is there no escape quotes/backslashes function in JS?)
    let replacements: [string | RegExp, string][] = [
        [/\<\?php/g, ""],
        [/;;/g, ";"],
    ];

    if (
        ["linux", "openbsd", "sunos", "darwin"].some((unixPlatforms) =>
            os.platform().includes(unixPlatforms),
        )
    ) {
        replacements.push([/\$/g, "\\$"]);
        replacements.push([/\\'/g, "\\\\'"]);
        replacements.push([/\\"/g, '\\\\"']);
    }

    replacements.push([/\"/g, '\\"']);

    replacements.forEach((replacement) => {
        code = code.replace(replacement[0], replacement[1]);
    });

    // TODO: Command template includes {code} placeholder? Hm. Why?
    let commandTemplate =
        vscode.workspace
            .getConfiguration("Laravel")
            .get<string>("phpCommand") ?? 'php -r "{code}"';

    let command = commandTemplate.replace("{code}", code);

    let out = new Promise<string>(function (resolve, error) {
        if (description !== null) {
            Logger.channel?.info("Command started: " + description);
        }

        // Logger.channel?.info(command);

        cp.exec(
            command,
            {
                cwd:
                    vscode.workspace.workspaceFolders &&
                    vscode.workspace.workspaceFolders.length > 0
                        ? vscode.workspace.workspaceFolders[0].uri.fsPath
                        : undefined,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    if (description !== null) {
                        Logger.channel?.info("Resolved: " + description);
                    }

                    return resolve(stdout);
                }

                const errorOutput = stderr.length > 0 ? stderr : stdout;

                Logger.channel?.error(
                    "Error:\n " + (description ?? "") + "\n\n" + errorOutput,
                );

                Logger.channel?.error(command);

                Helpers.showErrorPopup();

                error(errorOutput);
            },
        );
    });
    return out;
};

export const artisan = (command: string): Promise<string> => {
    const fullCommand = Helpers.projectPath("artisan") + " " + command;

    return new Promise<string>((resolve, error) => {
        const result = cp.exec(
            fullCommand,
            {
                cwd:
                    vscode.workspace.workspaceFolders &&
                    vscode.workspace.workspaceFolders.length > 0
                        ? vscode.workspace.workspaceFolders[0].uri.fsPath
                        : undefined,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    return resolve(stdout);
                }

                const errorOutput = stderr.length > 0 ? stderr : stdout;

                Logger.channel?.error(
                    "Error:\n " + (command ?? "") + "\n\n" + errorOutput,
                );

                Helpers.showErrorPopup();

                error(errorOutput);
            },
        );
    });
};
