import { FileDownloader, getApi } from "@microsoft/vscode-file-downloader-api";
import ParsingResult from "@src/parser/ParsingResult";
import * as cp from "child_process";
import * as os from "os";
import engine from "php-parser";
import * as vscode from "vscode";
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

export const setParserBinaryPath = (context: vscode.ExtensionContext) => {
    downloadBinary(context).then((path) => {
        if (path) {
            parserBinaryPath = process.env.PHP_PARSER_BINARY_PATH || path;
            parserBinaryPath = path.replace(" ", "\\ ");
        }
    });
};

const downloadBinary = async (context: vscode.ExtensionContext) => {
    const binaryVersion = "0.1.0";
    const filename = `php-parser-${binaryVersion}`;
    const uri = `https://github.com/joetannenbaum/php-parser-cli/raw/refs/heads/main/bin/${filename}`;

    const fileDownloader: FileDownloader = await getApi();

    const downloadedFiles: vscode.Uri[] =
        await fileDownloader.listDownloadedItems(context);

    for (const file of downloadedFiles) {
        // Clean up after ourselves
        if (!file.fsPath.includes(filename)) {
            const filename = file.path.split("/").pop();

            if (filename !== undefined) {
                await fileDownloader.deleteItem(filename, context);
            }
        }
    }

    const downloadedFile: vscode.Uri | undefined =
        await fileDownloader.tryGetItem(filename, context);

    if (downloadedFile !== undefined) {
        return downloadedFile.fsPath;
    }

    vscode.window.showInformationMessage(
        "Downloading binary for Laravel extension",
    );

    try {
        const file: vscode.Uri = await fileDownloader.downloadFile(
            vscode.Uri.parse(uri),
            filename,
            context,
        );

        cp.execSync(`chmod +x ${file.fsPath.replace(" ", "\\ ")}`);

        vscode.window.showInformationMessage(
            "Binary downloaded for Laravel extension",
        );

        return file.fsPath;
    } catch (e) {
        console.log(e);
        vscode.window.showErrorMessage(
            "Failed to download binary for Laravel extension",
        );
    }
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
