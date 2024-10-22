import * as vscode from "vscode";

export const openFile = (
    uri: vscode.Uri | string,
    lineNumber: number,
    position: number,
): vscode.Command => {
    if (typeof uri === "string") {
        uri = vscode.Uri.file(uri);
    }

    return {
        command: "laravel.open",
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
