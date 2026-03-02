import * as vscode from "vscode";
import { config } from "./config";
import { debugInfo } from "./debug";
import { channel, error } from "./logger";

let showErrorPopups = config<boolean>("showErrorPopups", false);
let lastErrorMessageShownAt = 0;
const maxMessageInterval = 10;

const normalizeMessages = (
    errors: string | Error | (string | Error)[],
): string[] => {
    if (!Array.isArray(errors)) {
        errors = [errors];
    }

    return errors.map((error) =>
        error instanceof Error ? error.message : error,
    );
};

export const showErrorPopup = (errors: string | Error | (string | Error)[]) => {
    const messages = normalizeMessages(errors);

    messages.forEach((message) => error(message));

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
                    ...messages,
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
