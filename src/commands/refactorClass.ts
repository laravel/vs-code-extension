import * as vscode from "vscode";

export const refactorClassCommand = () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    const match = selectedText.match(/class="([\s\S]+)"/);

    if (!match) {
        return;
    }

    const classes = match[1]
        .trim()
        .split(/\s+/)
        .map(cls => `'${cls}'`)
        .join(', ');

    const transformed = `@class([${classes}])`;

    editor.edit(editBuilder => {
        editBuilder.replace(selection, transformed);
    });
};