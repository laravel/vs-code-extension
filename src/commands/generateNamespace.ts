import os from "os";
import * as vscode from "vscode";

interface Namespace {
    namespace: string;
    path: string;
}

const readComposerJson = async (
    composerPath: vscode.Uri,
): Promise<Record<string, any>> => {
    try {
        const data = await vscode.workspace.fs.readFile(composerPath);

        return JSON.parse(Buffer.from(data).toString("utf8"));
    } catch {
        vscode.window.showErrorMessage("Failed to read composer.json");

        return {};
    }
};

const getPsr4Autoloads = async (
    composerPath: vscode.Uri,
): Promise<Record<string, string>> => {
    const json = await readComposerJson(composerPath);

    const autoload = json["autoload"]?.["psr-4"] ?? {};
    const autoloadDev = json["autoload-dev"]?.["psr-4"] ?? {};

    return {
        ...autoload,
        ...autoloadDev,
    };
};

export const getNamespace = async (
    workspaceFolder: vscode.WorkspaceFolder,
    fileUri: vscode.Uri,
): Promise<string | undefined> => {
    const composerPath = vscode.Uri.joinPath(
        workspaceFolder.uri,
        "composer.json",
    );

    const autoloads = await getPsr4Autoloads(composerPath);

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
        return;
    }

    return (
        findNamespace.namespace +
        fileUri.path
            .replace(`${workspaceFolder.uri.path}/${findNamespace.path}`, "")
            .replace(/\/?[^\/]+$/, "")
            .replace(/\//g, "\\")
    ).replace(/\\$/, "");
};

const getNamespaceReplacement = (
    newNamespace: string,
    content: string,
): { match: RegExpMatchArray | null; replaceNamespace: string | null } => {
    let match;

    // Case when the file is empty
    if (content.length === 0) {
        return {
            match: null,
            replaceNamespace: `<?php${os.EOL}${os.EOL}namespace ${newNamespace};`,
        };
    }

    // Case when the file already has a namespace
    if ((match = content.match(/^namespace\s+(?:[A-Za-z0-9_\\]+);$/m))) {
        return {
            match,
            replaceNamespace: `namespace ${newNamespace};`,
        };
    }

    // Case when the file already has a php open tag, but without a namespace
    if ((match = content.match(/^<\?php(?:\s*declare\s*\(.*?\)\s*;)*/m))) {
        return {
            match,
            replaceNamespace: `${match?.[0]}${os.EOL}${os.EOL}namespace ${newNamespace};`,
        };
    }

    return {
        match: null,
        replaceNamespace: null,
    };
};

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

    const newNamespace = await getNamespace(workspaceFolder, fileUri);

    if (!newNamespace) {
        vscode.window.showErrorMessage("Failed to find a matching namespace");

        return;
    }

    const doc = editor.document;
    const text = doc.getText();

    const { replaceNamespace, match } = getNamespaceReplacement(
        newNamespace,
        text,
    );

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
