"use strict";

import { LogOutputChannel, window } from "vscode";

export default class Logger {
    static channel: LogOutputChannel | null = null;

    static setup() {
        if (Logger.channel !== null) {
            return;
        }

        Logger.channel = window.createOutputChannel("Laravel", { log: true });
    }

    static info(message: string, ...args: any[]) {
        Logger.setup();
        Logger.channel?.info(message, ...args);
    }

    static warn(message: string, ...args: any[]) {
        Logger.setup();
        Logger.channel?.warn(message, ...args);
    }

    static error(message: string, ...args: any[]) {
        Logger.setup();
        Logger.channel?.error(message, ...args);
    }

    static bigInfo(message: string, ...args: any[]) {
        Logger.setup();
        Logger.channel?.info("---------------");
        Logger.channel?.info(message);
        Logger.channel?.info("---------------");
    }
}
