// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as fs from "fs";
import * as path from "path";

import axios, { AxiosResponse } from "axios";
import { rimraf } from "rimraf";
import { Readable } from "stream";
import { v4 as uuid } from "uuid";
import { CancellationToken, ExtensionContext, Uri } from "vscode";
import { FileDownloadSettings, IFileDownloader } from "./IFileDownloader";
import { IGithubRelease } from "./IGitHubRelease";
import ILogger from "./logging/ILogger";
import IHttpRequestHandler from "./networking/IHttpRequestHandler";
import {
    DownloadCanceledError,
    ErrorUtils,
    FileNotFoundError,
} from "./utility/Errors";
import { RetryUtility } from "./utility/RetryUtility";
import { pipelineAsync } from "./utility/Stream";

const DefaultTimeoutInMs = 5000;
const DefaultRetries = 5;
const DefaultRetryDelayInMs = 100;

export class FileDownloader implements IFileDownloader {
    public constructor(
        private readonly _requestHandler: IHttpRequestHandler,
        private readonly _logger: ILogger,
    ) {}

    private static getDownloadsStoragePath(context: ExtensionContext): string {
        return path.join(
            context.globalStorageUri.fsPath,
            `file-downloader-downloads`,
        );
    }

    /**
     * @param settings optional additional settings for the download. If this is not provided, we will set the Accept header
     * to application/octet-stream.
     */
    public async downloadFileFromGitHubRelease(
        owner: string,
        repository: string,
        fileName: string,
        context: ExtensionContext,
        cancellationToken?: CancellationToken,
        onDownloadProgressChange?: (
            downloadedBytes: number,
            totalBytes: number | undefined,
        ) => void,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        settings = {
            headers: { Accept: `application/octet-stream` },
        } as FileDownloadSettings,
    ): Promise<Uri> {
        const url = await this.getGitHubDownloadLink(
            owner,
            repository,
            fileName,
        );
        if (url === undefined) {
            throw new Error(`Failed to get download link for ${fileName}.`);
        }

        // Make sure we always have the Accept header set to application/octet-stream
        if (settings.headers === undefined) {
            settings.headers = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Accept: `application/octet-stream`,
            };
        } else if (settings.headers.Accept === undefined) {
            settings.headers.Accept = `application/octet-stream`;
        }

        // If the GITHUB_TOKEN is set, then use it to download the file
        // and then we wont get rate limited.
        const token = process.env.GITHUB_TOKEN;
        if (token !== null) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            settings.headers.Authorization = `Bearer ${token}`;
        }

        return this.downloadFile(
            url,
            fileName,
            context,
            cancellationToken,
            onDownloadProgressChange,
            settings,
        );
    }

    public async downloadFile(
        url: Uri,
        filename: string,
        context: ExtensionContext,
        cancellationToken?: CancellationToken,
        onDownloadProgressChange?: (
            downloadedBytes: number,
            totalBytes: number | undefined,
        ) => void,
        settings?: FileDownloadSettings,
    ): Promise<Uri> {
        if (url.scheme !== `http` && url.scheme !== `https`) {
            throw new Error(
                `Unsupported URI scheme in url. Supported schemes are http and https.`,
            );
        }

        this._logger.log(`Starting download from ${url}`);

        const downloadsStoragePath: string =
            FileDownloader.getDownloadsStoragePath(context);
        // Generate a temporary filename for the download
        const tempFileDownloadPath: string = path.join(
            downloadsStoragePath,
            uuid(),
        );
        const tempZipFileDownloadPath = `${tempFileDownloadPath}.zip`;
        const fileDownloadPath: string = path.join(
            downloadsStoragePath,
            filename,
        );
        await fs.promises.mkdir(downloadsStoragePath, { recursive: true });

        const timeoutInMs = settings?.timeoutInMs ?? DefaultTimeoutInMs;
        const retries = settings?.retries ?? DefaultRetries;
        const retryDelayInMs =
            settings?.retryDelayInMs ?? DefaultRetryDelayInMs;
        const shouldUnzip = settings?.shouldUnzip ?? false;
        const makeExecutable = settings?.makeExecutable ?? false;
        const headers = settings?.headers;
        let progress = 0;
        let progressTimerId: any;
        try {
            progressTimerId = setInterval(() => {
                if (progress <= 100) {
                    // TODO: the whole timer should be under this if.
                    if (
                        onDownloadProgressChange !== null &&
                        onDownloadProgressChange !== undefined
                    ) {
                        onDownloadProgressChange(progress++, 100);
                    }
                } else {
                    clearInterval(progressTimerId);
                }
            }, 1500);

            const downloadStream: Readable = await this._requestHandler.get(
                url.toString(),
                timeoutInMs,
                retries,
                retryDelayInMs,
                headers,
                cancellationToken,
                onDownloadProgressChange,
            );

            const writeStream = fs.createWriteStream(
                shouldUnzip ? tempZipFileDownloadPath : tempFileDownloadPath,
            );
            const pipelinePromise = pipelineAsync([
                downloadStream,
                writeStream,
            ]);
            const writeStreamClosePromise = new Promise((resolve) =>
                writeStream.on(`close`, resolve),
            );
            await Promise.all([pipelinePromise, writeStreamClosePromise]);

            // if (shouldUnzip) {
            //     const unzipDownloadedFileAsyncFn = async (): Promise<void> => {
            //         await fs.promises.access(tempZipFileDownloadPath);
            //         await extractZip(tempZipFileDownloadPath, {
            //             dir: tempFileDownloadPath,
            //         });
            //         await rimraf(tempZipFileDownloadPath);
            //     };
            //     await RetryUtility.exponentialRetryAsync(
            //         unzipDownloadedFileAsyncFn,
            //         unzipDownloadedFileAsyncFn.name,
            //         retries,
            //         retryDelayInMs,
            //     );
            // }

            // Set progress to 100%
            if (
                onDownloadProgressChange !== null &&
                onDownloadProgressChange !== undefined
            ) {
                clearInterval(progressTimerId);
                onDownloadProgressChange(100, 100);
            }
        } catch (error) {
            if (error instanceof Error) {
                this._logger.error(
                    `${error.message}. Technical details: ${JSON.stringify(
                        error,
                    )}`,
                );
            } else {
                this._logger.error(
                    `${error}. Technical details: ${JSON.stringify(error)}`,
                );
            }
            if (progressTimerId !== null) {
                clearInterval(progressTimerId);
            }
            throw error;
        }

        if (cancellationToken?.isCancellationRequested ?? false) {
            await rimraf(tempFileDownloadPath);
            throw new DownloadCanceledError();
        }

        // Make the file executable if requested
        // File permissions are preserved after moving the file
        // Files are downloaded with 0o644 file permissions
        try {
            if (makeExecutable) {
                await fs.promises.chmod(tempFileDownloadPath, 0o744);
            }
        } catch (error) {
            if (error instanceof Error) {
                this._logger.error(
                    `File cannot be made executable: ${tempFileDownloadPath}. Technical details: ${JSON.stringify(
                        error,
                    )}`,
                );
            }
            throw error;
        }

        try {
            // If the file/folder already exists, remove it now
            await rimraf(fileDownloadPath);

            const renameDownloadedFileAsyncFn = async (): Promise<Uri> => {
                // Move the temp file/folder to its permanent location and return it
                await fs.promises.rename(
                    tempFileDownloadPath,
                    fileDownloadPath,
                );
                return Uri.file(fileDownloadPath);
            };

            return RetryUtility.exponentialRetryAsync(
                renameDownloadedFileAsyncFn,
                renameDownloadedFileAsyncFn.name,
                retries,
                retryDelayInMs,
            );
        } catch (error) {
            if (error instanceof Error) {
                this._logger.error(
                    `Failed during post download operation with error: ${
                        error.message
                    }. Technical details: ${JSON.stringify(error)}`,
                );
            }
            throw error;
        }
    }

    public async listDownloadedItems(
        context: ExtensionContext,
    ): Promise<Uri[]> {
        const downloadsStoragePath =
            FileDownloader.getDownloadsStoragePath(context);
        try {
            const filePaths: string[] =
                await fs.promises.readdir(downloadsStoragePath);
            return filePaths.map((filePath) =>
                Uri.file(path.join(downloadsStoragePath, filePath)),
            );
        } catch (error) {
            if (ErrorUtils.isErrnoException(error) && error.code === `ENOENT`) {
                return [];
            } else {
                throw error;
            }
        }
    }

    public async getItem(
        filename: string,
        context: ExtensionContext,
    ): Promise<Uri> {
        const filePaths = await this.listDownloadedItems(context);
        const matchingUris = filePaths.filter(
            (uri) => uri.path.split(`/`).pop() === filename.replace(`/`, ``),
        );
        switch (matchingUris.length) {
            case 1:
                return matchingUris[0];
            case 0:
                throw new FileNotFoundError(
                    path.join(
                        FileDownloader.getDownloadsStoragePath(context),
                        filename,
                    ),
                );
            default:
                throw new Error(
                    `Unexpectedly found too many files or directories. Paths found: ${filePaths.map(
                        (uri) => uri.toString(),
                    )}`,
                );
        }
    }

    public async tryGetItem(
        filename: string,
        context: ExtensionContext,
    ): Promise<Uri | undefined> {
        try {
            return await this.getItem(filename, context);
        } catch (error) {
            if (error instanceof FileNotFoundError) {
                return undefined;
            } else {
                throw error;
            }
        }
    }

    public async deleteItem(
        filename: string,
        context: ExtensionContext,
    ): Promise<void> {
        await rimraf(
            path.join(
                FileDownloader.getDownloadsStoragePath(context),
                filename,
            ),
        );
    }

    public async deleteAllItems(context: ExtensionContext): Promise<void> {
        await rimraf(FileDownloader.getDownloadsStoragePath(context));
    }

    // Gets the download link for the latest release of a repo in GitHub.
    // Returns an empty string if the file is not found.
    // Example:
    // https://github.com/microsoft/vscode/releases/latest
    // owner: microsoft
    // repository: vscode
    // fileName: 1.8.3.zip
    // Returns: Either a link or undefined.
    private async getGitHubDownloadLink(
        owner: string,
        repository: string,
        fileName: string,
    ): Promise<Uri | undefined> {
        try {
            const response: AxiosResponse<IGithubRelease> = await axios.get(
                `https://api.github.com/repos/${owner}/${repository}/releases/latest`,
            );
            for (const asset of response.data.assets) {
                if (asset.name === fileName) {
                    return Uri.parse(asset.url);
                }
            }
        } catch (error) {
            // Maybe GitHub is down, don't stop the extension from working.
            this._logger.error(
                `Failed to access https://api.github.com/repos/${owner}/${repository} for ${fileName}. Technical details: ${JSON.stringify(
                    error,
                )}`,
            );
        }

        this._logger.error(`${fileName} not found in latest release.`);
        return undefined;
    }
}
