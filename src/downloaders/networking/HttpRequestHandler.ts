// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Readable } from "stream";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { CancellationToken } from "vscode";
import ILogger from "../logging/ILogger";
import { RetryUtility } from "../utility/RetryUtility";
import IHttpRequestHandler from "./IHttpRequestHandler";

export default class HttpRequestHandler implements IHttpRequestHandler {
    public constructor(private readonly _logger: ILogger) { }

    public async get(
        url: string,
        timeoutInMs: number,
        retries: number,
        retryDelayInMs: number,
        headers?: Record<string, string | number | boolean>,
        cancellationToken?: CancellationToken,
        onDownloadProgressChange?: (downloadedBytes: number, totalBytes: number) => void
    ): Promise<Readable> {
        const requestFn = () => this.getRequestHelper(
            url,
            timeoutInMs,
            headers,
            cancellationToken,
            onDownloadProgressChange
        );
        const errorHandlerFn = (error: Error) => {
            const statusCode = (error as any)?.response?.status;
            if (statusCode != null && 400 <= statusCode && statusCode < 500) {
                throw error;
            }
        };
        return RetryUtility.exponentialRetryAsync(requestFn, `HttpRequestHandler.get`, retries, retryDelayInMs, errorHandlerFn);
    }

    private async getRequestHelper(
        url: string,
        timeoutInMs: number,
        headers?: Record<string, string | number | boolean>,
        cancellationToken?: CancellationToken,
        onDownloadProgressChange?: (downloadedBytes: number, totalBytes: number) => void
    ): Promise<Readable> {
        const options: AxiosRequestConfig = {
            timeout: timeoutInMs,
            responseType: `stream`,
            proxy: false, // Disabling axios proxy support allows VS Code proxy settings to take effect.
            headers
        };

        if (cancellationToken != null) {
            const cancelToken = axios.CancelToken;
            const cancelTokenSource = cancelToken.source();
            cancellationToken.onCancellationRequested(() => cancelTokenSource.cancel());
            options.cancelToken = cancelTokenSource.token;
        }

        let response: AxiosResponse<Readable> | undefined;
        try {
            response = await axios.get(url, options);
            if (response === undefined) {
                throw new Error(`Undefined response received when downloading from '${url}'`);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this._logger.error(`${error.message}. Technical details: ${JSON.stringify(error)}`);
            }
            throw error;
        }

        const downloadStream: Readable = response.data;

        if (cancellationToken != null) {
            cancellationToken.onCancellationRequested(() => {
                downloadStream.destroy();
            });
        }

        // We should not feed of the data handler here if we are going to pipe the downloadStream later on.
        // Doing this forks the pipe and creates problem e.g. FILE_ENDED, PREMATURE_CLOSE
        // https://nodejs.org/api/stream.html#stream_choose_one_api_style
        // We should make this progress reporter code a transform pipe and place it between the downloadStream and the unzipper.
        // if (onDownloadProgressChange != null) {
        //     const headers: { [key: string]: any } = response.headers;
        //     const contentLength = parseInt(headers[`content-length`], 10);
        //     const totalBytes = contentLength as number ?? undefined;
        //     let downloadedBytes = 0;

        //     downloadStream.on(`data`, (chunk: Buffer) => {
        //         downloadedBytes += chunk.length;
        //         if (onDownloadProgressChange != null) {
        //             onDownloadProgressChange(downloadedBytes, totalBytes);
        //         }
        //     });
        // }

        return downloadStream;
    }
}