import * as vscode from "vscode";

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
