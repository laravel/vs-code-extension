// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Readable } from "stream";
import { CancellationToken } from "vscode";

export default interface IHttpRequestHandler {
    get(
        url: string,
        timeoutInMs: number,
        retries: number,
        retryDelayInMs: number,
        headers?: Record<string, string | number | boolean>,
        cancellationToken?: CancellationToken,
        onDownloadProgressChange?: (downloadedBytes: number, totalBytes: number) => void
    ): Promise<Readable>;
}