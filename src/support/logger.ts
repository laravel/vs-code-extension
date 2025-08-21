"use strict";

import { window } from "vscode";

let channel = window.createOutputChannel("Laravel", { log: true });

const info = (message: string, ...args: any[]) => {
    channel.info(message, ...args);
};

const warn = (message: string, ...args: any[]) => {
    channel.warn(message, ...args);
};

const error = (message: string, ...args: any[]) => {
    channel.error(message, ...args);
};

const bigInfo = (message: string, ...args: any[]) => {
    channel.info("---------------");
    channel.info(message, ...args);
    channel.info("---------------");
};

export { bigInfo, channel, error, info, warn };
