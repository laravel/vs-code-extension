import * as vscode from "vscode";
import { RegisteredCommand } from "./generatedRegisteredCommands";

export const commandName = (name: RegisteredCommand) => name;

export const openFile = (
    uri: vscode.Uri | string,
    lineNumber: number,
    position: number,
): vscode.Command => {
    if (typeof uri === "string") {
        uri = vscode.Uri.file(uri);
    }

    return {
        command: commandName("laravel.open"),
        title: "Open file",
        arguments: [uri, lineNumber, position],
    };
};

export const openFileCommand = (
    uri: vscode.Uri,
    lineNumber: number,
    position: number,
) => {
    vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(
            new vscode.Position(lineNumber, position),
            new vscode.Position(lineNumber, position),
        ),
    });
};
