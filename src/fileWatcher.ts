import * as vscode from "vscode";
import { getWorkspaceFolders, hasWorkspace } from "./support/project";

type FileEvent = "change" | "create" | "delete";

export const createFileWatcher = (
    pattern: string,
    callback: (e: vscode.Uri) => void,
    events: FileEvent[] = ["change", "create", "delete"],
): vscode.FileSystemWatcher | null => {
    if (!hasWorkspace()) {
        return null;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(getWorkspaceFolders()[0], pattern),
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
