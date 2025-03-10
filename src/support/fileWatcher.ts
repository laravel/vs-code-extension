import { readdirSync } from "fs";
import * as vscode from "vscode";
import { getWorkspaceFolders, hasWorkspace } from "./project";
import { leadingDebounce } from "./util";

type FileEvent = "change" | "create" | "delete";

let watchers: vscode.FileSystemWatcher[] = [];

export type WatcherPattern =
    | string
    | string[]
    | (() => Promise<string | string[] | null>);

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

    const debounceTime = 1000;

    if (patterns instanceof Function) {
        patterns().then((result) => {
            if (result !== null) {
                createFileWatcher(
                    result,
                    leadingDebounce(load, debounceTime),
                    events,
                );
            }
        });
    } else {
        createFileWatcher(
            patterns,
            leadingDebounce(load, debounceTime),
            events,
        );
    }
};

let appDirsRead = false;
const appDirs: string[] = [];
const ignoreDirs = ["node_modules", ".git", "vendor", "storage"];

export const inAppDirs = (pattern: string) => {
    if (!appDirsRead) {
        appDirsRead = true;
        readdirSync(getWorkspaceFolders()[0].uri.fsPath, {
            withFileTypes: true,
        }).forEach((file) => {
            if (file.isDirectory() && !ignoreDirs.includes(file.name)) {
                appDirs.push(file.name);
            }
        });
    }

    if (appDirs.length === 0) {
        return pattern;
    }

    return `{${appDirs.join(",")}}${pattern}`;
};

const patternWatchers: Record<
    string,
    {
        watcher: vscode.FileSystemWatcher;
        callbacks: [
            {
                callback: (e: vscode.Uri) => void;
                events: FileEvent[];
            },
        ];
    }
> = {};

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
        if (patternWatchers[pattern]) {
            patternWatchers[pattern].callbacks.push({ callback, events });

            return patternWatchers[pattern].watcher;
        }

        const relativePattern = new vscode.RelativePattern(
            getWorkspaceFolders()[0],
            pattern,
        );

        const watcher = vscode.workspace.createFileSystemWatcher(
            relativePattern,
            !events.includes("create"),
            !events.includes("change"),
            !events.includes("delete"),
        );

        watcher.onDidChange((...args) => {
            patternWatchers[pattern].callbacks.forEach((cb) => {
                if (cb.events.includes("change")) {
                    cb.callback(...args);
                }
            });
        });

        watcher.onDidCreate((...args) => {
            patternWatchers[pattern].callbacks.forEach((cb) => {
                if (cb.events.includes("create")) {
                    cb.callback(...args);
                }
            });
        });

        watcher.onDidDelete((...args) => {
            patternWatchers[pattern].callbacks.forEach((cb) => {
                if (cb.events.includes("delete")) {
                    cb.callback(...args);
                }
            });
        });

        patternWatchers[pattern] = {
            watcher,
            callbacks: [{ callback, events }],
        };

        registerWatcher(watcher);

        return watcher;
    });
};

export const registerWatcher = (watcher: vscode.FileSystemWatcher) => {
    watchers.push(watcher);
};

export const disposeWatchers = () => {
    watchers.forEach((watcher) => watcher.dispose());
    watchers = [];
};
