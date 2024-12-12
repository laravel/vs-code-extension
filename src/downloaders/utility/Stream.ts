// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { promisify } from "util";
import { pipeline, finished } from "stream";

type AnyStream = NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream;

export const finishedAsync = promisify(finished);
export let pipelineAsync = promisify(pipeline);

// Workaround https://github.com/nodejs/node/issues/40191
// todo: remove it when fix is released in 16.x and in AppEngine 16.x
if (process.version > `v16.13`) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pipeline } = require(`stream/promises`);
    pipelineAsync = ((streams: AnyStream[]) => pipeline(...streams)) as any;
}