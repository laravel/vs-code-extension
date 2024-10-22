import * as cp from "child_process";
import * as os from "os";
import engine from "php-parser";
import ParsingResult from "../parser/ParsingResult";
import { info } from "./logger";

// TODO: Problem?
// @ts-ignore
const parser = new engine({
    parser: {
        extractDoc: true,
        php8: true,
    },
});

const currentlyParsing = new Map<string, Promise<ParsingResult>>();

type TokenFormatted = [string, string, number];
type Token = string | TokenFormatted;

let parserBinaryPath: string | undefined = process.env.PHP_PARSER_BINARY_PATH;

export const setParserBinaryPath = (path: string) => {
    parserBinaryPath = process.env.PHP_PARSER_BINARY_PATH || path;
};

export const getTokens = (code: string): Token[] => {
    return parser.tokenGetAll(code);
};

export const getNormalizedTokens = (code: string): TokenFormatted[] => {
    return parser
        .tokenGetAll(code)
        .map((token: Token) => {
            if (typeof token === "string") {
                return ["T_CUSTOM_STRING", token, -1];
            }

            return token;
        })
        .filter((token: Token) => token[0] !== "T_WHITESPACE");
};

export const parseFaultTolerant = async (
    code: string,
): Promise<ParsingResult> => {
    let replacements: [string | RegExp, string][] = [[/;;/g, ";"]];

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

    if (!parserBinaryPath) {
        const waitForPath = async () => {
            if (!parserBinaryPath) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });

                return waitForPath();
            }
        };

        await waitForPath();
    }

    let command = `${parserBinaryPath} parse "${code}"`;

    info("ft command ", command);

    const result = cp.execSync(command).toString();

    info("ft result ", result);

    return new Promise<ParsingResult>(function (resolve, error) {
        cp.exec(
            command,
            {
                cwd: __dirname,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    console.log("parsing result", JSON.parse(stdout));
                    return resolve(new ParsingResult(JSON.parse(stdout)));
                }

                const errorOutput = stderr.length > 0 ? stderr : stdout;

                error(errorOutput);
            },
        );
    });
};

export const parse = (
    code: string,
    depth = 0,
): Promise<ParsingResult | null> => {
    if (currentlyParsing.has(code)) {
        return currentlyParsing.get(code) as Promise<ParsingResult>;
    }

    const promise = parseFaultTolerant(code);

    currentlyParsing.set(code, promise);

    return promise;
};
