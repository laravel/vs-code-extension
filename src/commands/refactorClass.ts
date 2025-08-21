import * as vscode from "vscode";

const transformClass = (classList: string) => {
    const classes = classList
        .trim()
        .split(/\s+/)
        .map((cls) => `'${cls}'`)
        .join(", ");

    return `@class([${classes}])`;
};

export const refactorAllClassesCommand = () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    const document = editor.document;
    const fullText = document.getText();

    const transformed = fullText.replace(
        /(?<!:)class="(.+?)"/g,
        (_, classList) => {
            return transformClass(classList);
        },
    );

    const entireRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(fullText.length),
    );

    editor.edit((editBuilder) => {
        editBuilder.replace(entireRange, transformed);
    });
};

export const refactorSelectedClassCommand = () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    const match = selectedText.match(/(?<!:)class="(.+?)"/);

    if (!match) {
        return;
    }

    const transformed = selectedText.replace(
        /(?<!:)class="(.+?)"/,
        transformClass(match[1]),
    );

    editor.edit((editBuilder) => {
        editBuilder.replace(selection, transformed);
    });
};
