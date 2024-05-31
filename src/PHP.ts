import * as fs from "fs";
import * as vscode from "vscode";
import Helpers from "./helpers";
import Logger from "./Logger";
import * as os from "os";
import * as cp from "child_process";
import engine from "php-parser";

// TODO: Problem?
// @ts-ignore
const parser = new engine({
    parser: {
        extractDoc: true,
        php8: true,
    },
});

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

type TokenFormatted = [string, string, number];
type Token = string | TokenFormatted;

const getToken = (tokens: TokenFormatted[], index: string, offset: number) =>
    tokens[parseInt(index) + offset];

const extractClassAndFunction = (tokens: TokenFormatted[]) => {
    const func = tokens.shift()?.[1];

    if (!["T_OBJECT_OPERATOR", "T_DOUBLE_COLON"].includes(tokens[0][0])) {
        // Just a function, return early
        return [null, func];
    }

    let variableToFind = null;

    for (let i in tokens) {
        const [type, value, line] = tokens[i];

        if (variableToFind) {
            if (type === "T_VARIABLE" && value === variableToFind) {
                const nextToken = getToken(tokens, i, 1);
                const previousToken = getToken(tokens, i, -1);

                if (
                    nextToken[0] === "T_STRING" ||
                    nextToken[0] === "T_NAME_QUALIFIED"
                ) {
                    // Type hinted, we got the class
                    return [nextToken[1], func];
                }

                if (
                    nextToken[1] === "(" &&
                    getToken(tokens, i, 2)[0] === "T_FUNCTION"
                ) {
                    // It was a param in a function, no type hint, no class
                    return [null, func];
                }

                if (previousToken[1] === "=") {
                    if (
                        getToken(tokens, i, -2)[0] === "T_NEW" &&
                        (getToken(tokens, i, -3)[0] === "T_STRING" ||
                            getToken(tokens, i, -3)[0] === "T_NAME_QUALIFIED")
                    ) {
                        return [getToken(tokens, i, -3)[1], func];
                    }

                    if (
                        getToken(tokens, i, -2)[0] === "T_STRING" ||
                        getToken(tokens, i, -2)[0] === "T_NAME_QUALIFIED"
                    ) {
                        return [getToken(tokens, i, -2)[1], func];
                    }

                    return [null, func];
                }
            }

            continue;
        }

        if (type === "T_DOUBLE_COLON") {
            return [getToken(tokens, i, 1)[1], func];
        }

        if (type === "T_OBJECT_OPERATOR") {
            const nextToken = getToken(tokens, i, 1);

            if (nextToken[0] === "T_VARIABLE") {
                variableToFind = nextToken[1];
            }
        }
    }

    return [null, func];
};

export interface ParsingResult {
    class?: string;
    function?: string;
    paramIndex: number;
    parameters: string[];
}

export const parse = (code: string): ParsingResult | null => {
    const tokens = parser
        .tokenGetAll(code)
        .filter(
            (token: Token) =>
                typeof token === "string" || token[0] !== "T_WHITESPACE",
        )
        .map((token: Token) => {
            if (typeof token === "string") {
                return ["T_CUSTOM_STRING", token, -1];
            }

            return token;
        })
        .reverse();

    let result: ParsingResult | null = null;

    const firstToken = tokens.shift();

    if (
        firstToken[0] !== "T_CONSTANT_ENCAPSED_STRING" &&
        firstToken[1] !== '"'
    ) {
        // We are only concerned with ' and " as the trigger
        return null;
    }

    let closedParens = 0;

    let params = [];

    for (let i in tokens) {
        const nextToken = tokens.shift();
        const [type, value, line] = nextToken;

        if (value === ")") {
            closedParens++;
            params.push(nextToken);
            continue;
        }

        if (value === "(") {
            if (closedParens === 0) {
                const [cls, func] = extractClassAndFunction(tokens);

                result = {
                    paramIndex: 0,
                    parameters: [],
                };

                if (cls) {
                    result.class = cls;
                }

                if (func) {
                    result.function = func;
                }

                break;
            }

            closedParens--;
        }

        params.push(nextToken);
    }

    if (!result) {
        return null;
    }

    let nestedLevel = 0;

    let currentParam = "";

    const finalParams = [];

    const paramsToLoop = params.reverse();

    for (let i in paramsToLoop) {
        const [type, value, line] = params[i];

        if (["[", "(", "{"].includes(value)) {
            nestedLevel++;
            currentParam += value;

            continue;
        }

        if (["]", ")", "}"].includes(value)) {
            nestedLevel--;
            currentParam += value;

            continue;
        }

        if (nestedLevel > 0) {
            const finalValue = type === "T_RETURN" ? value + " " : value;

            currentParam += finalValue;

            continue;
        }

        if (value !== ",") {
            const finalValue =
                type === "T_CONSTANT_ENCAPSED_STRING"
                    ? value.substring(1).slice(0, -1)
                    : value;

            currentParam += finalValue;

            continue;
        }

        finalParams.push(currentParam);
        currentParam = "";
    }

    result.parameters = finalParams;
    result.paramIndex = finalParams.length;

    return result;
};
