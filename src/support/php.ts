import * as cp from "child_process";
import * as os from "os";
import { TemplateName, getTemplate } from "../templates";
import { config } from "./config";
import { error } from "./logger";
import { showErrorPopup } from "./popup";
import { getWorkspaceFolders, projectPath, projectPathExists } from "./project";

const toTemplateVar = (str: string) => {
    return `__VSCODE_LARAVEL_${str.toUpperCase()}__`;
};

let defaultPhpCommand: string | null = null;

const getPhpCommand = (): string => {
    const options = [
        {
            check: ["which herd", "{binaryPath} which-php"],
            command: '{binaryPath} -r "{code}"',
        },
        {
            check: "which php",
            command: '{binaryPath} -r "{code}"',
        },
        {
            check: "which sail",
            command: '{binaryPath} php -r "{code}"',
        },
    ];

    for (const option of options) {
        try {
            const checks = Array.isArray(option.check)
                ? option.check
                : [option.check];
            let check = checks.shift();
            let result = "";

            while (check) {
                result = cp
                    .execSync(check)
                    .toString()
                    .trim()
                    .replace("{binaryPath}", result.replace(/ /g, "\\ "));

                check = checks.shift();
            }

            if (result !== "") {
                return option.command.replace(
                    "{binaryPath}",
                    result.replace(/ /g, "\\ "),
                );
            }
        } catch (e) {
            // ignore
        }
    }

    return `php -r "{code}"`;
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

const hasVendor = projectPathExists("vendor/autoload.php");
const hasBootstrap = projectPathExists("bootstrap/app.php");

export const runInLaravel = <T>(
    code: string,
    description: string | null = null,
    asJson: boolean = true,
): Promise<T> => {
    code = code.replace(/(?:\r\n|\r|\n)/g, " ");

    if (!hasVendor) {
        throw new Error("Vendor autoload not found, run composer install");
    }

    if (!hasBootstrap) {
        throw new Error("Bootstrap file not found, not a Laravel project");
    }

    const command = template("bootstrapLaravel", {
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
                "gs",
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

// TODO: Make sure all of these replacements are necessary
// (also is there no escape quotes/backslashes function in JS?)
const replacements: [string | RegExp, string][] = [
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

export const runPhp = (
    code: string,
    description: string | null = null,
): Promise<string> => {
    replacements.forEach((replacement) => {
        code = code.replace(replacement[0], replacement[1]);
    });

    const commandTemplate =
        config<string>("phpCommand", getDefaultPhpCommand()) ||
        getDefaultPhpCommand();

    const command = commandTemplate.replace("{code}", code);

    const out = new Promise<string>(function (resolve, error) {
        cp.exec(
            command,
            {
                cwd: getWorkspaceFolders()[0]?.uri?.fsPath,
            },
            (err, stdout, stderr) => {
                if (err === null) {
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
