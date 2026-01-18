import { FileDownloader } from "@src/downloaders/FileDownloader";
import OutputLogger from "@src/downloaders/logging/OutputLogger";
import HttpRequestHandler from "@src/downloaders/networking/HttpRequestHandler";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { repository } from "@src/repositories";
import { AutocompleteParsingResult } from "@src/types";
import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";
import { FeatureTag, ValidDetectParamTypes } from "..";
import { Cache } from "./cache";
import { showErrorPopup } from "./popup";
import { md5, tempPath, toArray } from "./util";

const currentlyParsing = new Cache<string, Promise<AutocompleteResult>>(100);
const detected = new Cache<
    string,
    Promise<AutocompleteParsingResult.ContextValue[]>
>(50);

export const clearParserCaches = (): void => {
    currentlyParsing.clear();
    detected.clear();
};

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
        }
    });
};

const downloadBinary = async (context: vscode.ExtensionContext) => {
    const binaryVersion = "0.1.44";
    const osPlatform = os.platform();
    const osArch = os.arch();
    const extension = osPlatform === "win32" ? ".exe" : "";
    const filename = `php-parser-v${binaryVersion}-${osArch}-${osPlatform}${extension}`;

    const uri = `https://github.com/laravel/vs-code-php-parser-cli/releases/download/v${binaryVersion}/${filename}`;

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
            undefined,
            undefined,
            {
                timeoutInMs: 60_000,
            },
        );

        if (osPlatform !== "win32") {
            cp.execSync(`chmod +x "${file.fsPath}"`);
        }

        vscode.window.showInformationMessage(
            "Binary downloaded for Laravel extension",
        );

        return file.fsPath;
    } catch (e) {
        vscode.window.showErrorMessage(
            `Failed to download binary for Laravel extension: ${filename}`,
        );
    }
};

const cleanArg = (arg: string): string => {
    if (os.platform() === "win32") {
        const tempFile = tempPath(md5(arg));

        if (!fs.existsSync(tempFile)) {
            fs.writeFileSync(tempFile, arg);
        }

        return tempFile;
    }

    const replacements: [string | RegExp, string][] = [[/;;/g, ";"]];

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
    replacements.push([/\`/g, "\\`"]);

    replacements.forEach((replacement) => {
        arg = arg.replace(replacement[0], replacement[1]);
    });

    return arg;
};

export const detect = async (
    doc: vscode.TextDocument,
): Promise<AutocompleteParsingResult.ContextValue[]> => {
    const code = doc.getText();

    if (detected.has(code)) {
        return detected.get(code) as Promise<
            AutocompleteParsingResult.ContextValue[]
        >;
    }

    const promise = runCommand("detect", cleanArg(code))
        .then((result: string) => {
            return result.length > 0 ? JSON.parse(result) : result;
        })
        .catch((err) => {
            showErrorPopup(err);
        }) as Promise<AutocompleteParsingResult.ContextValue[]>;

    detected.set(code, promise);

    return promise;
};

const runCommand = (subCommand: string, arg: string): Promise<string> => {
    return new Promise(async function (resolve, error) {
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

        const args = [subCommand, arg];

        if (os.platform() === "win32") {
            args.push("--from-file");
        }

        // Using execFile with arguments as array avoids shell interpretation entirely
        cp.execFile(
            parserBinaryPath as string,
            args,
            {
                cwd: __dirname,
                timeout: 5000,
            },
            (
                err: cp.ExecFileException | null,
                stdout: string,
                stderr: string,
            ) => {
                if (err === null) {
                    return resolve(stdout);
                }

                return error(stderr.length > 0 ? stderr : stdout);
            },
        );
    });
};

export const parseForAutocomplete = (
    code: string,
): Promise<AutocompleteResult | null> => {
    if (currentlyParsing.has(code)) {
        return currentlyParsing.get(code) as Promise<AutocompleteResult>;
    }

    const arg = cleanArg(code);

    const promise = runCommand("autocomplete", arg)
        .then((result: string) => {
            return new AutocompleteResult(JSON.parse(result));
        })
        .catch((err) => {
            showErrorPopup(err);
        })
        .finally(() => {
            if (os.platform() === "win32") {
                fs.unlink(arg, () => null);
            }
        }) as Promise<AutocompleteResult>;

    currentlyParsing.set(code, promise);

    return promise;
};

export const detectInDoc = <T, U extends ValidDetectParamTypes>(
    document: vscode.TextDocument,
    toFind: FeatureTag,
    repo: ReturnType<typeof repository>,
    cb: (arg: {
        param: Extract<AutocompleteParsingResult.ContextValue, { type: U }>;
        index: number;
        item: AutocompleteParsingResult.ContextValue;
    }) => T[] | T | null,
    validParamTypes: ValidDetectParamTypes[] = ["string"],
): Promise<T[]> => {
    return detect(document).then((results) => {
        if (!results) {
            return Promise.resolve([]);
        }

        return Promise.all(
            results
                .filter(
                    (result) =>
                        result.type === "object" ||
                        result.type === "methodCall",
                )
                .filter((result) => {
                    return toArray(toFind).some((toFind) => {
                        return (
                            toArray(toFind.class ?? null).includes(
                                result.className ?? null,
                            ) &&
                            toArray(toFind.method ?? null).includes(
                                // @ts-ignore
                                result.methodName ?? null,
                            )
                        );
                    });
                })
                .map((item) => {
                    return repo().whenLoaded(() =>
                        item.arguments.children
                            .flatMap((arg, index) => {
                                // @ts-ignore
                                return arg.children.map((child) => {
                                    if (
                                        !validParamTypes.includes(
                                            child.type ?? "",
                                        )
                                    ) {
                                        return null;
                                    }

                                    // Come on, TypeScript
                                    const finalParam = child as Extract<
                                        AutocompleteParsingResult.ContextValue,
                                        { type: U }
                                    >;

                                    try {
                                        return toArray<T | T[] | null>(
                                            cb({
                                                param: finalParam,
                                                index,
                                                item,
                                            }),
                                        );
                                    } catch (e) {
                                        console.log(e);
                                        return null;
                                    }
                                });
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
    param: AutocompleteParsingResult.StringValue,
): boolean => {
    if (!param.start || !param.end) {
        return false;
    }

    return (
        param.start.line === range.start.line &&
        param.start.column === range.start.character &&
        param.end.column + 2 === range.end.character
    );
};

export const detectedRange = (
    param: AutocompleteParsingResult.StringValue,
): vscode.Range => {
    if (!param.start || !param.end) {
        return new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0),
        );
    }

    return new vscode.Range(
        new vscode.Position(param.start.line, param.start.column + 1),
        new vscode.Position(param.end.line, param.end.column + 1),
    );
};
