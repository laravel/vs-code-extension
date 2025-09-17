import * as vscode from "vscode";

interface Namespace {
    namespace: string;
    path: string;
}

export const generateNamespaceCommand = async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage("No active file in the editor");

        return;
    }

    const fileUri = editor.document.uri;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Cannot detect active workspace");

        return;
    }

    const composerPath = vscode.Uri.joinPath(
        workspaceFolder.uri,
        "composer.json",
    );

    let json;

    try {
        const data = await vscode.workspace.fs.readFile(composerPath);

        json = JSON.parse(Buffer.from(data).toString("utf8"));
    } catch (err) {
        vscode.window.showErrorMessage("Failed to read composer.json");

        return;
    }

    const autoload = json["autoload"]?.["psr-4"] ?? {};
    const autoloadDev = json["autoload-dev"]?.["psr-4"] ?? {};

    const autoloads: Record<string, string> = {
        ...autoload,
        ...autoloadDev,
    };

    const namespaces: Namespace[] = Object.entries(autoloads)
        .map(([namespace, path]) => ({ namespace, path }))
        // We need to sort by length, because we need to check longer paths first, for example:
        //
        // "psr-4": {
        //    "App\\": "app/",
        //    "App\\AnotherNamespace\\": "app/anotherPath/",
        // }
        //
        // Otherwise, the system will first find the shorter one, which also matches
        .sort((a, b) => b.path.length - a.path.length);

    const findNamespace = namespaces.find((namespace) =>
        fileUri.path.startsWith(
            `${workspaceFolder.uri.path}/${namespace.path}`,
        ),
    );

    if (!findNamespace) {
        vscode.window.showErrorMessage("Failed to find a matching namespace");

        return;
    }

    const newNamespace = (
        findNamespace.namespace +
        fileUri.path
            .replace(`${workspaceFolder.uri.path}/${findNamespace.path}`, "")
            .replace(/\/?[^\/]+$/, "")
            .replace(/\//g, "\\")
    ).replace(/\\$/, "");

    const doc = editor.document;
    const text = doc.getText();

    let replaceNamespace = undefined;
    let match = undefined;

    // Case when the file is empty
    if (text.length === 0) {
        replaceNamespace = `<?php\n\nnamespace ${newNamespace};`;
    }
    // Case when the file already has a namespace
    else if ((match = text.match(/^namespace\s+(?:[A-Za-z0-9_\\]+);$/m))) {
        replaceNamespace = `namespace ${newNamespace};`;
    }
    // Case when the file already has a php open tag, but without a namespace
    else if ((match = text.match(/^<\?php(?:\s*declare\s*\(.*?\)\s*;)*/m))) {
        replaceNamespace = `${match?.[0]}\n\nnamespace ${newNamespace};`;
    }

    if (!replaceNamespace) {
        vscode.window.showErrorMessage("Failed to find a matching case");

        return;
    }

    const range =
        match?.index !== undefined
            ? new vscode.Range(
                doc.positionAt(match.index),
                doc.positionAt(match.index + match[0].length),
            )
            : doc.positionAt(0);

    editor.edit((editBuilder) => {
        editBuilder.replace(range, replaceNamespace);
    });
};
