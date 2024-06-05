import * as vscode from "vscode";
import { getWorkspaceFolders, hasWorkspace } from "./project";

type FileEvent = "change" | "create" | "delete";

export const loadAndWatch = (
    load: () => void,
    patterns: string | string[],
    events: FileEvent[] = ["change", "create", "delete"],
): void => {
    if (!hasWorkspace()) {
        return;
    }

    load();

    createFileWatcher(patterns, load, events);
};

export const createFileWatcher = (
    patterns: string | string[],
    callback: (e: vscode.Uri) => void,
    events: FileEvent[] = ["change", "create", "delete"],
): vscode.FileSystemWatcher[] => {
    if (!hasWorkspace()) {
        return [];
    }

    patterns = typeof patterns === "string" ? [patterns] : patterns;

    return patterns.map((pattern) => {
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
    });
};
