import * as vscode from "vscode";

export const generateNamespaceCommand = async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage("Brak aktywnego pliku w edytorze!");

        return;
    }

    const fileUri = editor.document.uri;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Plik nie należy do żadnego workspace!");
        return;
    }

    const composerPath = vscode.Uri.joinPath(
        workspaceFolder.uri,
        "composer.json",
    );

    try {
        const data = await vscode.workspace.fs.readFile(composerPath);
        const json = JSON.parse(Buffer.from(data).toString("utf8"));

        vscode.window.showInformationMessage(
            `Nazwa pakietu: ${json.name || "brak"}`,
        );
    } catch (err) {
        vscode.window.showErrorMessage("Nie udało się odczytać composer.json");
    }
};
