import * as vscode from "vscode";
import Logger from "../Logger";
import { config } from "./config";

let disableErrorPopup = config<boolean>("disableErrorAlert", false);
let lastErrorMessageShownAt = 0;

export const showErrorPopup = (...errors: string[]) => {
    errors.forEach((error) => Logger.error(error));

    if (disableErrorPopup) {
        return;
    }

    if (lastErrorMessageShownAt + 10 > Date.now() / 1000) {
        return;
    }

    lastErrorMessageShownAt = Date.now() / 1000;

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
                    Logger.channel?.show(true);
                    break;
            }
        });
};
