import * as vscode from "vscode";

export function getIndentNumber(extension: string): number | undefined {
    /**
     * {@link vscode.TextEditorOptions}
     */
    const config = vscode.workspace.getConfiguration("editor", {
        languageId: extension,
    });

    const insertSpaces = config.get<boolean | string | undefined>(
        "insertSpaces",
    );

    if (insertSpaces !== true) {
        return undefined;
    }

    const indentSize = config.get<number | string | undefined>("indentSize");

    if (typeof indentSize === "number") {
        return indentSize;
    }

    const tabSize = config.get<number | string | undefined>("tabSize");

    if (typeof tabSize === "number") {
        return tabSize;
    }

    return undefined;
}
