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

    const command = config<unknown>("phpCommand", []);

    if (isLegacyCommand(command)) {
        return ["php"];
    }

    if (Array.isArray(command) && command.length > 0) {
        return command;
    }

    return ["php"];
};

const isLegacyCommand = (command: unknown): boolean => {
    if (Array.isArray(command)) {
        return false;
    }

    if (!hasShownLegacyPhpCommandWarning) {
        hasShownLegacyPhpCommandWarning = true;

        vscode.window.showErrorMessage(
            'Laravel.phpCommand must now be configured as an array of strings, for example ["php"] or ["docker", "exec", "app", "php"].',
        );
    }

    return true;
};
