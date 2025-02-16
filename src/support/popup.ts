import * as vscode from "vscode";
import { config } from "./config";
import { debugInfo } from "./debug";
import { channel, error } from "./logger";

let showErrorPopups = config<boolean>("showErrorPopups", false);
let lastErrorMessageShownAt = 0;
const maxMessageInterval = 10;

export const showErrorPopup = (...errors: string[]) => {
    errors.forEach((message) => error(message));

    if (
        !showErrorPopups ||
        lastErrorMessageShownAt + maxMessageInterval > Date.now() / 1000
    ) {
        return;
    }

    lastErrorMessageShownAt = Date.now() / 1000;

    const actions = [
        {
            title: "View Error",
            command: () => {
                channel.show(true);
            },
        },
        {
            title: "Copy Error to Clipboard",
            command: () => {
                const finalMessage = [
                    "Debug Info",
                    "",
                    JSON.stringify(debugInfo, null, 2),
                    "",
                    "-".repeat(40),
                    "",
                    ...errors,
                ];

                vscode.env.clipboard.writeText(finalMessage.join("\n"));
            },
        },
        {
            title: "Don't show again",
            command: () => {
                showErrorPopups = false;
            },
        },
    ];

    vscode.window
        .showErrorMessage(
            "Error in Laravel Extension",
            ...actions.map((action) => action.title),
        )
        .then((val: string | undefined) => {
            actions.find((action) => action.title === val)?.command();
        });
};
