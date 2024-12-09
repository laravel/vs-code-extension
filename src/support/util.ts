import * as vscode from "vscode";
import { relativePath } from "./project";

/**
 * Get indent space based on user configuration
 */
export const indent = (text: string = "", repeat: number = 1): string => {
    const editor = vscode.window.activeTextEditor;

    if (editor && editor.options.insertSpaces) {
        return " ".repeat(<number>editor.options.tabSize * repeat) + text;
    }

    return "\t" + text;
};

export const trimQuotes = (text: string): string =>
    text.substring(1, text.length - 1);

export const relativeMarkdownLink = (uri: vscode.Uri): string => {
    return `[${relativePath(uri.path)}](${uri})`;
};

export const toArray = <T>(value: T | T[]): T[] => {
    return Array.isArray(value) ? value : [value];
};

export const facade = (className: string): string => {
    return support(`Facades\\${className}`);
};

export const support = (className: string): string => {
    return `Illuminate\\Support\\${className}`;
};
