import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import engine from "php-parser";
import { config } from "./config";
import { error, info } from "./logger";
import { showErrorPopup } from "./popup";
import { getWorkspaceFolders, projectPath, projectPathExists } from "./project";

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
        `${__dirname}/../templates/${name}.template`,
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

type TokenFormatted = [string, string, number];
type Token = string | TokenFormatted;

const getToken = (tokens: TokenFormatted[], index: string, offset: number) =>
    tokens[parseInt(index) + offset];

const getFqn = (
    tokens: TokenFormatted[],
    cls: string,
): {
    fqn?: string | null;
    class: string;
} => {
    const tokensReversed = tokens.reverse();
    const firstUse = tokensReversed.findIndex((token) => token[0] === "T_USE");

    if (firstUse === -1) {
        return {
            class: cls.split("\\").pop() ?? cls,
            fqn: cls,
        };
    }

    for (let j = firstUse; j < tokensReversed.length; j++) {
        const [type, value, line] = tokensReversed[j];

        if (type !== "T_USE") {
            continue;
        }

        const fqnCandidate = tokensReversed[j + 1];

        if (fqnCandidate[1] === cls) {
            return {
                class: cls.split("\\").pop() ?? cls,
                fqn: fqnCandidate[1],
            };
        }

        if (fqnCandidate[1].endsWith(`\\${cls}`)) {
            return {
                class: cls,
                fqn: fqnCandidate[1],
            };
        }

        const nextToken = tokensReversed[j + 2];

        if (nextToken[0] !== "T_AS") {
            continue;
        }

        const alias = tokensReversed[j + 3];

        if (alias[1] === cls) {
            return {
                class: fqnCandidate[1].split("\\").pop() ?? fqnCandidate[1],
                fqn: fqnCandidate[1],
            };
        }
    }

    return {
        class: cls,
    };
};

const extractClassAndFunction = (
    tokens: TokenFormatted[],
): {
    class?: string | null;
    fqn?: string | null;
    func?: string | null;
} => {
    const func = tokens.shift()?.[1];

    if (!["T_OBJECT_OPERATOR", "T_DOUBLE_COLON"].includes(tokens[0][0])) {
        // Just a function, return early
        return {
            func,
        };
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
                    const cls = nextToken[1];

                    // Type hinted, we got the class
                    return {
                        ...getFqn(tokens, cls),
                        func: func,
                    };
                }

                if (
                    nextToken[1] === "(" &&
                    getToken(tokens, i, 2)[0] === "T_FUNCTION"
                ) {
                    // It was a param in a function, no type hint, no class
                    return {
                        func,
                    };
                }

                if (previousToken[1] === "=") {
                    if (
                        getToken(tokens, i, -2)[0] === "T_NEW" &&
                        (getToken(tokens, i, -3)[0] === "T_STRING" ||
                            getToken(tokens, i, -3)[0] === "T_NAME_QUALIFIED")
                    ) {
                        const cls = getToken(tokens, i, -3)[1];

                        return {
                            ...getFqn(tokens, cls),
                            func,
                        };
                    }

                    if (
                        getToken(tokens, i, -2)[0] === "T_STRING" ||
                        getToken(tokens, i, -2)[0] === "T_NAME_QUALIFIED"
                    ) {
                        const cls = getToken(tokens, i, -2)[1];

                        return {
                            ...getFqn(tokens, cls),
                            func,
                        };
                    }

                    return {
                        func,
                    };
                }
            }

            continue;
        }

        if (type === "T_DOUBLE_COLON") {
            const cls = getToken(tokens, i, 1)[1];

            return {
                ...getFqn(tokens, cls),
                func,
            };
        }

        if (type === "T_OBJECT_OPERATOR") {
            const nextToken = getToken(tokens, i, 1);

            if (nextToken[0] === "T_VARIABLE") {
                variableToFind = nextToken[1];
            }
        }
    }

    return {
        func,
    };
};

export interface ParsingResult {
    class?: string;
    fqn?: string;
    function?: string;
    param: {
        index: number;
        isArray: boolean;
        isKey: boolean;
        key: string | null;
        keys: string[];
    };
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
        const nextToken = tokens[i];
        const [type, value, line] = nextToken;

        if (value === ")") {
            closedParens++;
            params.push(nextToken);
            continue;
        }

        if (value === "(") {
            if (closedParens === 0) {
                const {
                    class: cls,
                    func,
                    fqn,
                } = extractClassAndFunction(tokens.slice(parseInt(i) + 1));

                result = {
                    param: {
                        index: 0,
                        isArray: false,
                        isKey: false,
                        key: null,
                        keys: [],
                    },
                    parameters: [],
                };

                if (cls) {
                    result.class = cls;
                }

                if (func) {
                    result.function = func;
                }

                if (fqn) {
                    result.fqn = fqn;
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
    let paramTokens = [];

    // Params are in reverse order, so we need to loop them in their actual order
    const paramsToLoop = params.reverse();

    for (let i in paramsToLoop) {
        const [type, value, line] = params[i];

        if (["[", "(", "{"].includes(value)) {
            nestedLevel++;
            currentParam += value;
            paramTokens.push(params[i]);

            continue;
        }

        if (["]", ")", "}"].includes(value)) {
            nestedLevel--;
            currentParam += value;
            paramTokens.push(params[i]);

            continue;
        }

        if (nestedLevel > 0) {
            const finalValue = type === "T_RETURN" ? value + " " : value;

            currentParam += finalValue;
            paramTokens.push(params[i]);

            continue;
        }

        if (value !== ",") {
            const finalValue =
                type === "T_CONSTANT_ENCAPSED_STRING"
                    ? value.substring(1).slice(0, -1)
                    : value;

            currentParam += finalValue;
            paramTokens.push(params[i]);

            continue;
        }

        finalParams.push(currentParam);
        currentParam = "";
        paramTokens = [];
    }

    if (paramTokens.length > 0) {
        let finalParamNestingLevel = 0;
        let inKey = true;
        let currentKeys = [];

        for (let i in paramTokens) {
            const [type, value, line] = paramTokens[i];

            if (finalParamNestingLevel === 1 && inKey) {
                if (type === "T_CONSTANT_ENCAPSED_STRING") {
                    currentKeys.push(value.substring(1).slice(0, -1));
                }
            }

            if (type === "T_DOUBLE_ARROW") {
                inKey = false;
            }

            if (["["].includes(value)) {
                finalParamNestingLevel++;
                inKey = true;
            }

            if (["]"].includes(value)) {
                finalParamNestingLevel--;
                inKey = true;
            }
        }

        if (finalParamNestingLevel > 0) {
            result.param.isArray = true;
        }

        if (finalParamNestingLevel === 1) {
            if (["[", ","].includes(paramTokens[paramTokens.length - 1][1])) {
                result.param.isKey = true;
            }
        }

        result.param.keys = currentKeys;
    }

    result.parameters = finalParams;
    result.param.index = finalParams.length;

    return result;
};
