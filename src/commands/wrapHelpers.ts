import * as vscode from "vscode";

export const helpers = ["dd", "dump", "collect", "str"];

export const openSubmenuCommand = async () => {
    const choice = await vscode.window.showQuickPick(
        helpers.map((helper: string) => {
            return {
                label: `with ${helper}(...)`,
                command: `laravel.wrapHelpers.${helper}`,
            };
        }),
        {
            placeHolder: "Choose a wrap",
        },
    );

    if (choice) {
        vscode.commands.executeCommand(choice.command);
    }
};

export const wrapSelectionCommand = (wrapper: string) => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    const selection = editor.selection;
    let selectedText = editor.document.getText(selection);

    const lastChar = selectedText.at(-1) ?? "";
    const hasSeparator = [";", ","].includes(lastChar);

    if (hasSeparator) {
        selectedText = selectedText.slice(0, -1);
    }

    let transformed = `${wrapper}(${selectedText})`;

    if (hasSeparator) {
        transformed += lastChar;
    }

    editor.edit((editBuilder) => {
        editBuilder.replace(selection, transformed);
    });
};

export const unwrapSelectionCommand = () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    const match = selectedText.match(/^([a-zA-Z0-9_]+)\(/);

    if (!match) {
        return;
    }

    if (!helpers.includes(match[1])) {
        return;
    }

    const transformed = selectedText.replace(
        /[a-zA-Z0-9_]+\(([\s\S]+)\)(?!\))/,
        "$1",
    );

    editor.edit((editBuilder) => {
        editBuilder.replace(selection, transformed);
    });
};
