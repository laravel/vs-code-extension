// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CancellationToken, ExtensionContext, Uri } from "vscode";

export interface FileDownloadSettings {
    /**
     * Timeout in milliseconds for the request.
     * @default 5000
     */
    timeoutInMs?: number;
    /**
     * Number of retries for the request.
     * @default 5
     */
    retries?: number;
    /**
     * Delay in milliseconds between retries.
     * @default 100
     */
    retryDelayInMs?: number;
    /**
     * Whether to unzip the downloaded file.
     * @default false
     */
    shouldUnzip?: boolean;
    /**
     * Whether to make the downloaded file executable.
     * @default false
     */
    makeExecutable?: boolean;
    /**
     * Additional headers to send with the request.
     * @default undefined
     * @example
     * {
     *   headers: {"Accept": `application/octet-stream`}
     * }
     */
    headers?: Record<string, string | number | boolean> | undefined;
}

export interface IFileDownloader {
    /**
     * Downloads a file from a URL and gives back the file path, file name, and a checksum. Allows you to specify the
     * timeout, the number of acceptable retries, whether or not to unzip the file, and whether or not to check the
     * downloaded file against a checksum.
     *
     * @param url the URL to make a GET request to
     * @param filename the name of the file to retrieve the stored data in
     * @param context the ExtensionContext of the extension downloading the file
     * @param cancellationToken token that allows cancelling the download
     * @param onDownloadProgressChange a callback that gets called every time a new chunk of data comes from the server.
     * Note: the totalBytes parameter corresponds to the content-length provided by the server in the GET response
     * header. It could differ from the actual number of bytes in the download, or may not be provided at all.
     * @param settings optional additional settings for the download
     * @returns the URI containing the path to the downloaded file or unzipped directory
     */
    downloadFile(
        url: Uri,
        filename: string,
        context: ExtensionContext,
        cancellationToken?: CancellationToken,
        onDownloadProgressChange?: (downloadedBytes: number, totalBytes: number | undefined) => void,
        settings?: FileDownloadSettings
    ): Promise<Uri>;
    /**
     * Downloads a file from a GitHub release and gives back the file path, file name, and a checksum. Allows you to
     * specify the timeout, the number of acceptable retries, whether or not to unzip the file, and whether or not to
     * check the downloaded file against a checksum.
     *
     * @param owner the owner of the repository
     * @param repository the repository to download from
     * @param fileName the name of the file to download
     * @param context the context for the extension downloading the file
     * @param cancellationToken token that allows cancelling the download
     * @param onDownloadProgressChange a callback that gets called every time a new chunk of data comes from the server.
     * Note: the totalBytes parameter corresponds to the content-length provided by the server in the GET response
     * header. It could differ from the actual number of bytes in the download, or may not be provided at all.
     * @param settings optional additional settings for the download.
     * @returns the URI containing the path to the downloaded file or unzipped directory
     * @throws Error if the file is not found in the latest release
     * @example downloadFileFromGitHubRelease(`microsoft`, `vscode`, `VSCode-linux-x64.zip`, context);
     * @remarks This method is a wrapper around `downloadFile` that constructs the URL for the latest release of a
     * GitHub repository.
     */
    downloadFileFromGitHubRelease(
        owner: string,
        repository: string,
        fileName: string,
        context: ExtensionContext,
        cancellationToken?: CancellationToken,
        onDownloadProgressChange?: (downloadedBytes: number, totalBytes: number | undefined) => void,
        settings?: FileDownloadSettings
    ): Promise<Uri>;
    /**
     * Returns the paths of all files that exist in the consumer extensions' download folder
     *
     * @param context the context for the extension downloading the file
     * @returns an array of downloaded file or folder paths
     */
    listDownloadedItems(context: ExtensionContext): Promise<Uri[]>;
    /**
     * Gets the path to a downloaded or unzipped item.
     *
     * @param filename the name of the file or folder to remove
     * @param context The calling extension's context
     * @returns the path to the downloaded file (or folder if the download was unzipped)
     * @throws FileNotFoundError if there is no such file or folder
     */
    getItem(filename: string, context: ExtensionContext): Promise<Uri>;
    /**
     * Gets the path to a downloaded or unzipped item, but returns undefined instead of throwing an error if the file
     * isn't found.
     *
     * @param filename the name of the file or folder to remove
     * @param context The calling extension's context
     * @returns the path to the downloaded file (or folder if the download was unzipped)
     */
    tryGetItem(filename: string, context: ExtensionContext): Promise<Uri | undefined>;
    /**
     * Deletes the file specified by `filename`. The filename should match the name that the file was downloaded with.
     * Does not throw an error if the file doesn't exist, as the filesystem is already in the desired state.
     *
     * @param filename the name of the file or folder to remove
     * @context the context of the extension that downloaded the file
     */
    deleteItem(filename: string, context: ExtensionContext): Promise<void>;
    /**
     * Clears all files downloaded by the extension specified in the context. Does nothing if no files have been
     * downloaded.
     *
     * @param context the context of the extension that downloaded the file(s)
     */
    deleteAllItems(context: ExtensionContext): Promise<void>;
}
