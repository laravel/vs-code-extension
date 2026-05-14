import { FileDownloader } from "@src/downloaders/FileDownloader";
import OutputLogger from "@src/downloaders/logging/OutputLogger";
import HttpRequestHandler from "@src/downloaders/networking/HttpRequestHandler";
import * as cp from "child_process";
import * as os from "os";
import * as vscode from "vscode";

let lspBinaryPath: string | undefined = process.env.LARAVEL_LSP_BINARY_PATH;
let lspBinaryPathReady: Promise<string | undefined>;

export const getLspBinaryPath = (): Promise<string | undefined> => {
    return lspBinaryPathReady;
};

export const setLspBinaryPath = (context: vscode.ExtensionContext) => {
    if (lspBinaryPath) {
        lspBinaryPathReady = Promise.resolve(lspBinaryPath);
        return;
    }

    lspBinaryPathReady = downloadBinary(context).then((path) => {
        if (path) {
            lspBinaryPath = process.env.LARAVEL_LSP_BINARY_PATH || path;
        }

        return lspBinaryPath;
    });
};

const downloadBinary = async (context: vscode.ExtensionContext) => {
    const binaryVersion = "0.0.5";
    const osPlatform = os.platform();
    const osArch = os.arch();
    const extension = osPlatform === "win32" ? ".exe" : "";
    const filename = `server-v${binaryVersion}-${osArch}-${osPlatform}${extension}`;

    const uri = `https://github.com/laravel/lsp/releases/download/v${binaryVersion}/${filename}`;

    const logger = new OutputLogger(`File Downloader`, context);
    const requestHandler = new HttpRequestHandler(logger);
    const fileDownloader = new FileDownloader(requestHandler, logger);

    const downloadedFiles: vscode.Uri[] =
        await fileDownloader.listDownloadedItems(context);

    for (const file of downloadedFiles) {
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
                timeoutInMs: 300_000,
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
