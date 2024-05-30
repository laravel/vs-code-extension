import * as vscode from "vscode";

type FileEvent = "change" | "create" | "delete";

export const createFileWatcher = (
    pattern: string,
    callback: (e: vscode.Uri) => void,
    events: FileEvent[] = ["change", "create", "delete"],
): vscode.FileSystemWatcher | null => {
    if (vscode.workspace.workspaceFolders === undefined) {
        return null;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
            vscode.workspace.workspaceFolders[0],
            pattern,
        ),
    );

    if (events.includes("change")) {
        watcher.onDidChange(callback);
    }

    if (events.includes("create")) {
        watcher.onDidCreate(callback);
    }

    if (events.includes("delete")) {
        watcher.onDidDelete(callback);
    }

    return watcher;
};
