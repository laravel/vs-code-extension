import * as vscode from "vscode";
import { getWorkspaceFolders, hasWorkspace } from "./project";
import { debounce } from "./util";

type FileEvent = "change" | "create" | "delete";

export type WatcherPattern = string | string[];

export const defaultFileEvents: FileEvent[] = ["change", "create", "delete"];

export const loadAndWatch = (
    load: () => void,
    patterns: WatcherPattern,
    events: FileEvent[] = defaultFileEvents,
): void => {
    if (!hasWorkspace()) {
        return;
    }

    load();

    createFileWatcher(patterns, debounce(load, 750), events);
};

export const createFileWatcher = (
    patterns: string | string[],
    callback: (e: vscode.Uri) => void,
    events: FileEvent[] = defaultFileEvents,
): vscode.FileSystemWatcher[] => {
    if (!hasWorkspace()) {
        return [];
    }

    patterns = typeof patterns === "string" ? [patterns] : patterns;

    return patterns.map((pattern) => {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(getWorkspaceFolders()[0], pattern),
            !events.includes("create"),
            !events.includes("change"),
            !events.includes("delete"),
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
