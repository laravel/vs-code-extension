import { FileDownloader } from "@src/downloaders/FileDownloader";
import OutputLogger from "@src/downloaders/logging/OutputLogger";
import HttpRequestHandler from "@src/downloaders/networking/HttpRequestHandler";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { repository } from "@src/repositories";
import * as cp from "child_process";
import * as os from "os";
import * as vscode from "vscode";
import {
    DetectResult,
    DetectResultParam,
    DetectResultStringParam,
    FeatureTag,
    ValidDetectParamTypes,
} from "..";
import { showErrorPopup } from "./popup";
import { toArray } from "./util";

const currentlyParsing = new Map<string, Promise<AutocompleteResult>>();
const detected = new Map<string, Promise<DetectResult[]>>();

type TokenFormatted = [string, string, number];
type Token = string | TokenFormatted;

let parserBinaryPath: string | undefined = process.env.PHP_PARSER_BINARY_PATH;

export const setParserBinaryPath = (context: vscode.ExtensionContext) => {
    if (parserBinaryPath) {
        return;
    }

    downloadBinary(context).then((path) => {
        if (path) {
            parserBinaryPath = process.env.PHP_PARSER_BINARY_PATH || path;
            parserBinaryPath = path.replace(" ", "\\ ");
        }
    });
};

const downloadBinary = async (context: vscode.ExtensionContext) => {
    const binaryVersion = "0.1.2";
    const filename = `php-parser-${binaryVersion}`;
    const uri = `https://github.com/laravel/vs-code-php-parser-cli/raw/refs/heads/main/bin/${filename}`;

    const logger = new OutputLogger(`File Downloader`, context);
    const requestHandler = new HttpRequestHandler(logger);
    const fileDownloader = new FileDownloader(requestHandler, logger);

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

export const parseFaultTolerant = async (
    code: string,
): Promise<AutocompleteResult> => {
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

    const command = `${parserBinaryPath} autocomplete "${code}"`;

    // console.log("autocomplete command", command);

    return new Promise<AutocompleteResult>(function (resolve, error) {
        cp.exec(
            command,
            {
                cwd: __dirname,
                timeout: 5000,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    // console.log("parsing result", JSON.parse(stdout));
                    return resolve(new AutocompleteResult(JSON.parse(stdout)));
                }

                showErrorPopup(stderr.length > 0 ? stderr : stdout);
            },
        );
    });
};

export const detect = async (code: string): Promise<DetectResult[]> => {
    // We're about to modify the code for the command, but the key should be the original code
    const originalCode = code;

    if (detected.has(originalCode)) {
        return detected.get(originalCode) as Promise<DetectResult[]>;
    }

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

    const command = `${parserBinaryPath} detect "${code}"`;

    // console.log("detect command", command);

    const promise = new Promise<DetectResult[]>(function (resolve, error) {
        cp.exec(
            command,
            {
                cwd: __dirname,
                timeout: 5000,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    // console.log("detect result", JSON.parse(stdout));
                    return resolve(JSON.parse(stdout));
                }

                showErrorPopup(stderr.length > 0 ? stderr : stdout);
            },
        );
    });

    detected.set(originalCode, promise);

    return promise;
};

export const parse = (
    code: string,
    depth = 0,
): Promise<AutocompleteResult | null> => {
    if (currentlyParsing.has(code)) {
        return currentlyParsing.get(code) as Promise<AutocompleteResult>;
    }

    const promise = parseFaultTolerant(code);

    currentlyParsing.set(code, promise);

    return promise;
};

export const detectInDoc = <T, U extends ValidDetectParamTypes>(
    doc: vscode.TextDocument,
    toFind: FeatureTag,
    repo: ReturnType<typeof repository>,
    cb: (arg: {
        param: Extract<DetectResultParam, { type: U }>;
        index: number;
        item: DetectResult;
    }) => T[] | T | null,
    validParamTypes: ValidDetectParamTypes[] = ["string"],
): Promise<T[]> => {
    return detect(doc.getText().trim()).then((results) => {
        return Promise.all(
            results
                .filter((result) => {
                    return toArray(toFind).some((toFind) => {
                        return (
                            toArray(toFind.class ?? null).includes(
                                result.class,
                            ) &&
                            toArray(toFind.method ?? null).includes(
                                result.method,
                            )
                        );
                    });
                })
                .map((item) => {
                    return repo().whenLoaded(() =>
                        item.params
                            .map((param, index) => {
                                if (validParamTypes.includes(param.type)) {
                                    // Come on, TypeScript
                                    const finalParam = param as Extract<
                                        DetectResultParam,
                                        { type: U }
                                    >;

                                    return toArray<T | T[] | null>(
                                        cb({ param: finalParam, index, item }),
                                    );
                                }

                                return null;
                            })
                            .flat(2)
                            .filter((item) => item !== null),
                    );
                }),
        );
    });
};

export const isInHoverRange = (
    range: vscode.Range,
    param: DetectResultStringParam,
): boolean => {
    return (
        param.start.line === range.start.line &&
        param.start.column === range.start.character &&
        param.end.column + 2 === range.end.character
    );
};

export const detectedRange = (param: DetectResultStringParam): vscode.Range => {
    return new vscode.Range(
        new vscode.Position(param.start.line, param.start.column + 1),
        new vscode.Position(param.end.line, param.end.column + 1),
    );
};
