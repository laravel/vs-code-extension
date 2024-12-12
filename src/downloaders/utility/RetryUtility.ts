// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RetriesExceededError } from "./Errors";

export class RetryUtility {
    public static async exponentialRetryAsync<T>(
        requestFn: () => Promise<T>,
        operationName: string,
        retries: number,
        initialDelayInMs: number,
        errorHandlerFn?: (error: Error) => void
    ): Promise<T> {
        try {
            return await requestFn();
        }
        catch (error) {
            if (error instanceof Error) {
                if (retries === 0) {
                    throw new RetriesExceededError(error, operationName);
                }

                if (errorHandlerFn != null) {
                    errorHandlerFn(error);
                }
            }
            await new Promise((resolve): void => {
                setTimeout(resolve, initialDelayInMs);
            });
            return this.exponentialRetryAsync(requestFn, operationName, retries - 1, initialDelayInMs * 2, errorHandlerFn);
        }
    }
}