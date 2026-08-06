import * as vscode from "vscode";
import { config } from "../support/config";

let hasShownLegacyPhpCommandWarning = false;
let resolvedPhpCommand: string[] | undefined;

export const setResolvedPhpCommand = (command: string[]): void => {
    resolvedPhpCommand = command;
};

export const clearResolvedPhpCommand = (): void => {
    resolvedPhpCommand = undefined;
};

export const getPhpCommand = (): string[] => {
    if (resolvedPhpCommand) {
        return resolvedPhpCommand;
    }

    const command = config<unknown>("phpCommand", ["php"]);

    return Array.isArray(command) ? command : ["php"];
};

export const warnAboutLegacyPhpCommand = (): void => {
    if (hasShownLegacyPhpCommandWarning) {
        return;
    }

    if (Array.isArray(config<unknown>("phpCommand", []))) {
        return;
    }

    hasShownLegacyPhpCommandWarning = true;

    vscode.window.showErrorMessage(
        'MIGRATION WARNING: Please update your Laravel.phpCommand setting to use the new argv array-of-strings format, for example ["php"] or ["docker", "exec", "app", "php"].',
    );
};
