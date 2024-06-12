import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import { config } from "./config";
import { error, info } from "./logger";
import { showErrorPopup } from "./popup";
import { getWorkspaceFolders, projectPath, projectPathExists } from "./project";

const templates: { [key: string]: string } = {};

const toTemplateVar = (str: string) => {
    return `__VSCODE_LARAVEL_${str.toUpperCase()}__`;
};

const getTemplate = (name: string) => {
    if (templates[name]) {
        return templates[name];
    }

    templates[name] = fs.readFileSync(
        `${__dirname}/../templates/${name}.php`,
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

export const runInLaravel = <T>(
    code: string,
    description: string | null = null,
    asJson: boolean = true,
): Promise<T> => {
    code = code.replace(/(?:\r\n|\r|\n)/g, " ");

    if (
        !projectPathExists("vendor/autoload.php") ||
        !projectPathExists("bootstrap/app.php")
    ) {
        return new Promise((resolve, error) => error("Not a Laravel project"));
    }

    const command = template("bootstrap-laravel", {
        output: code,
        vendor_autoload_path: projectPath("vendor/autoload.php", true),
        bootstrap_path: projectPath("bootstrap/app.php", true),
    });

    return runPhp(command, description)
        .then((result: string) => {
            const regex = new RegExp(
                toTemplateVar("start_output") +
                    "(.*)" +
                    toTemplateVar("end_output"),
                "g",
            );

            const out = regex.exec(result);

            if (out && out[1]) {
                return asJson ? JSON.parse(out[1]) : out[1];
            }

            // TODO: Fix this
            error("Parse Error:\n " + (description ?? "") + "\n\n" + result);

            throw new Error("No output found");
        })
        .catch((error) => {
            showErrorPopup(command);
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
    let commandTemplate = config<string>("phpCommand", 'php -r "{code}"');

    let command = commandTemplate.replace("{code}", code);

    let out = new Promise<string>(function (resolve, error) {
        if (description !== null) {
            info("Command started: " + description);
        }

        // Logger.info(command);

        cp.exec(
            command,
            {
                cwd: getWorkspaceFolders()[0]?.uri?.fsPath,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    if (description !== null) {
                        info("Resolved: " + description);
                    }

                    return resolve(stdout);
                }

                const errorOutput = stderr.length > 0 ? stderr : stdout;

                showErrorPopup(
                    "Error:\n " + (description ?? "") + "\n\n" + errorOutput,
                    command,
                );

                error(errorOutput);
            },
        );
    });
    return out;
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
