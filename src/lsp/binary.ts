import { FileDownloader } from "../downloaders/FileDownloader";
import { IAsset } from "../downloaders/IGitHubRelease";
import OutputLogger from "../downloaders/logging/OutputLogger";
import HttpRequestHandler from "../downloaders/networking/HttpRequestHandler";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

const LAST_UPDATE_CHECK_KEY = "laravel.lsp.lastUpdateCheck";
export const LSP_UPDATE_THROTTLE_MS = 2 * 60 * 60 * 1000;

let lspBinaryPath: string | undefined = process.env.LARAVEL_LSP_BINARY_PATH;
let lspBinaryPathReady: Promise<string | undefined> =
    Promise.resolve(lspBinaryPath);
let fileDownloader: FileDownloader | undefined;
let updateQueue: Promise<void> = Promise.resolve();

export type LspBinaryUpdateResult =
    | {
          status: "updated";
          path: string;
          previousPath?: string;
          backupPath?: string;
      }
    | {
          status: "current" | "throttled";
          path?: string;
      }
    | {
          status: "custom";
          path: string;
      };

export const getLspBinaryPath = (): Promise<string | undefined> => {
    return lspBinaryPathReady;
};

export const isUsingCustomLspBinary = (): boolean => {
    return process.env.LARAVEL_LSP_BINARY_PATH !== undefined;
};

export const shouldCheckForLspUpdate = (
    lastCheck: number | undefined,
    now: number = Date.now(),
): boolean => {
    return lastCheck === undefined || now - lastCheck >= LSP_UPDATE_THROTTLE_MS;
};

export const findLspReleaseAsset = (
    assets: Pick<IAsset, "name" | "browser_download_url">[],
    platform: NodeJS.Platform = os.platform(),
    arch: string = os.arch(),
): Pick<IAsset, "name" | "browser_download_url"> | undefined => {
    const extension = platform === "win32" ? ".exe" : "";
    const suffix = `-${arch}-${platform}${extension}`;

    return assets.find(
        (asset) =>
            asset.name.startsWith("server-v") && asset.name.endsWith(suffix),
    );
};

export const findCachedLspBinary = (
    files: vscode.Uri[],
    platform: NodeJS.Platform = os.platform(),
    arch: string = os.arch(),
): vscode.Uri | undefined => {
    const extension = platform === "win32" ? ".exe" : "";
    const suffix = `-${arch}-${platform}${extension}`;

    return files
        .filter((file) => {
            const filename = path.basename(file.fsPath);

            return filename.startsWith("server-v") && filename.endsWith(suffix);
        })
        .sort((left, right) =>
            path
                .basename(right.fsPath)
                .localeCompare(path.basename(left.fsPath), undefined, {
                    numeric: true,
                }),
        )[0];
};

export const setLspBinaryPath = (context: vscode.ExtensionContext): void => {
    if (isUsingCustomLspBinary()) {
        setActiveLspBinaryPath(process.env.LARAVEL_LSP_BINARY_PATH);
        return;
    }

    lspBinaryPathReady = initializeLspBinaryPath(context);
};

export const updateLspBinary = (
    context: vscode.ExtensionContext,
    options: { force?: boolean } = {},
): Promise<LspBinaryUpdateResult> => {
    const update = updateQueue.then(() =>
        performLspBinaryUpdate(context, options.force ?? false),
    );

    updateQueue = update.then(
        () => undefined,
        () => undefined,
    );

    return update;
};

export const completeLspBinaryUpdate = async (
    context: vscode.ExtensionContext,
    result: LspBinaryUpdateResult,
): Promise<void> => {
    if (result.status !== "updated") {
        return;
    }

    const downloader = getFileDownloader(context);
    const files = await downloader.listDownloadedItems(context);

    for (const file of files) {
        const filename = path.basename(file.fsPath);

        if (filename.startsWith("server-v") && file.fsPath !== result.path) {
            await downloader.deleteItem(filename, context);
        }
    }
};

export const rollbackLspBinaryUpdate = async (
    context: vscode.ExtensionContext,
    result: LspBinaryUpdateResult,
): Promise<void> => {
    if (result.status !== "updated") {
        return;
    }

    const downloader = getFileDownloader(context);

    if (result.backupPath) {
        await downloader.deleteItem(path.basename(result.path), context);
        await fs.promises.rename(result.backupPath, result.path);
    } else if (result.path !== result.previousPath) {
        await downloader.deleteItem(path.basename(result.path), context);
    }

    setActiveLspBinaryPath(result.previousPath);
};

const initializeLspBinaryPath = async (
    context: vscode.ExtensionContext,
): Promise<string | undefined> => {
    const downloader = getFileDownloader(context);
    const cachedBinary = findCachedLspBinary(
        await downloader.listDownloadedItems(context),
    );

    if (cachedBinary) {
        setActiveLspBinaryPath(cachedBinary.fsPath);
        return cachedBinary.fsPath;
    }

    vscode.window.showInformationMessage(
        "Downloading binary for Laravel extension",
    );

    try {
        const result = await updateLspBinary(context, { force: true });

        if (result.status === "updated") {
            await completeLspBinaryUpdate(context, result);
            vscode.window.showInformationMessage(
                "Binary downloaded for Laravel extension",
            );

            return result.path;
        }

        return result.path;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to download binary for Laravel extension: ${errorMessage(error)}`,
        );
    }

    return undefined;
};

const performLspBinaryUpdate = async (
    context: vscode.ExtensionContext,
    force: boolean,
): Promise<LspBinaryUpdateResult> => {
    if (isUsingCustomLspBinary()) {
        return {
            status: "custom",
            path: process.env.LARAVEL_LSP_BINARY_PATH!,
        };
    }

    const lastCheck = context.globalState.get<number>(LAST_UPDATE_CHECK_KEY);

    if (!force && !shouldCheckForLspUpdate(lastCheck)) {
        return { status: "throttled", path: lspBinaryPath };
    }

    await context.globalState.update(LAST_UPDATE_CHECK_KEY, Date.now());

    const downloader = getFileDownloader(context);
    const release = await downloader.getLatestGitHubRelease("laravel", "lsp");

    if (!release) {
        throw new Error("Unable to retrieve the latest Laravel LSP release");
    }

    const asset = findLspReleaseAsset(release.assets);

    if (!asset) {
        throw new Error(
            `The latest Laravel LSP release has no binary for ${os.arch()}-${os.platform()}`,
        );
    }

    const downloadedFile = await downloader.tryGetItem(asset.name, context);

    if (downloadedFile && !force) {
        setActiveLspBinaryPath(downloadedFile.fsPath);

        return { status: "current", path: downloadedFile.fsPath };
    }

    const previousPath = lspBinaryPath;
    const pendingFilename = `${asset.name}.pending`;
    const pendingFile = await downloader.downloadFile(
        vscode.Uri.parse(asset.browser_download_url),
        pendingFilename,
        context,
        undefined,
        undefined,
        {
            timeoutInMs: 300_000,
            makeExecutable: os.platform() !== "win32",
        },
    );
    const targetPath = path.join(path.dirname(pendingFile.fsPath), asset.name);
    const backupPath = `${targetPath}.backup`;
    let hasBackup = false;

    try {
        await downloader.deleteItem(path.basename(backupPath), context);

        try {
            await fs.promises.rename(targetPath, backupPath);
            hasBackup = true;
        } catch (error) {
            if (!isFileNotFoundError(error)) {
                throw error;
            }
        }

        await fs.promises.rename(pendingFile.fsPath, targetPath);
    } catch (error) {
        if (hasBackup) {
            await fs.promises.rename(backupPath, targetPath);
        }

        throw error;
    }

    setActiveLspBinaryPath(targetPath);

    return {
        status: "updated",
        path: targetPath,
        previousPath,
        backupPath: hasBackup ? backupPath : undefined,
    };
};

const getFileDownloader = (
    context: vscode.ExtensionContext,
): FileDownloader => {
    if (!fileDownloader) {
        const logger = new OutputLogger("File Downloader", context);
        const requestHandler = new HttpRequestHandler(logger);
        fileDownloader = new FileDownloader(requestHandler, logger);
    }

    return fileDownloader;
};

const setActiveLspBinaryPath = (binaryPath: string | undefined): void => {
    lspBinaryPath = binaryPath;
    lspBinaryPathReady = Promise.resolve(binaryPath);
};

const isFileNotFoundError = (error: unknown): boolean => {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
    );
};

const errorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};
