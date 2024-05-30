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
}
