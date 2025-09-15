import * as vscode from "vscode";
import { commandName } from ".";

type SubCommand = "dd" | "dump" | "collect" | "str" | "unwrap";

export const helpers: SubCommand[] = ["dd", "dump", "collect", "str"];

export const wrapWithHelperCommands = {
    wrap: commandName("laravel.wrapWithHelper"),
    unwrap: commandName("laravel.wrapWithHelper.unwrap"),
};

export const wrapHelperCommandNameSubCommandName = (command: SubCommand) =>
    `${wrapWithHelperCommands.wrap}.${command}`;

export const openSubmenuCommand = async () => {
    const choice = await vscode.window.showQuickPick(
        helpers.map((helper) => ({
            label: `${helper}(...)`,
            command: wrapHelperCommandNameSubCommandName(helper),
        })),
        {
            placeHolder: "Wrap with...",
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

    if (!match || !helpers.includes(match[1] as SubCommand)) {
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
