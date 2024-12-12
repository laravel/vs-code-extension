// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export default interface ILogger {
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}