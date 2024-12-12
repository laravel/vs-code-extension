// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget

export class DownloadCanceledError extends Error {
    public constructor() {
        super(`Download canceled.`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DownloadCanceledError.name;
    }
}

export class FileNotFoundError extends Error {
    public constructor(path: string) {
        super(`File not found at path ${path}.`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = FileNotFoundError.name;
    }
}

export class RetriesExceededError extends Error {
    public constructor(error: Error, operationName: string) {
        super(`Maximum number of retries exceeded. The operation '${operationName}' failed with error: ${error.message}. Technical details: ${JSON.stringify(error)}`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = `${RetriesExceededError.name} for operation '${operationName}'`;
    }
}

export class ErrorUtils {
    public static isErrnoException(object: unknown): object is NodeJS.ErrnoException {
        return Object.prototype.hasOwnProperty.call(object, `code`)
            || Object.prototype.hasOwnProperty.call(object, `errno`);
    }
}