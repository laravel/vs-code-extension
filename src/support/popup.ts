import * as vscode from "vscode";
import { channel, error } from "./logger";

let disableErrorPopup = false;
// let disableErrorPopup = config<boolean>("disableErrorAlert", false);
let lastErrorMessageShownAt = 0;

export const showErrorPopup = (...errors: string[]) => {
    errors.forEach((message) => error(message));

    if (disableErrorPopup) {
        return;
    }

    if (lastErrorMessageShownAt + 10 > Date.now() / 1000) {
        return;
    }

    lastErrorMessageShownAt = Date.now() / 1000;

    return;

    vscode.window
        .showErrorMessage(
            "Laravel VS Code error",
            "View Error",
            "Don't show again",
        )
        .then((val: string | undefined) => {
            switch (val) {
                case "Don't show again":
                    disableErrorPopup = true;
                    break;
                case "View Error":
                    channel.show(true);
                    break;
            }
        });
};
