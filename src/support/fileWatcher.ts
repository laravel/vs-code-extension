import { readdirSync } from "fs";
import * as vscode from "vscode";
import { getWorkspaceFolders, hasWorkspace } from "./project";
import { debounce, leadingDebounce } from "./util";

export type FileEvent = "change" | "create" | "delete";

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
    reloadOnComposerChanges: boolean = true,
): void => {
    if (!hasWorkspace()) {
        return;
    }

    load();

    const loadFunc = leadingDebounce(load, 1000);

    if (patterns instanceof Function) {
        patterns().then((result) => {
            if (result !== null) {
                createFileWatcher(
                    result,
                    loadFunc,
                    events,
                    reloadOnComposerChanges,
                );
            }
        });
    } else {
        createFileWatcher(patterns, loadFunc, events, reloadOnComposerChanges);
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
                reloadOnComposerChanges: boolean;
            },
        ];
    }
> = {};

export const watchForComposerChanges = () => {
    const onChange = debounce((e) => {
        for (const pattern in patternWatchers) {
            patternWatchers[pattern].callbacks.forEach((cb) => {
                if (cb.reloadOnComposerChanges) {
                    cb.callback(e);
                }
            });
        }
    }, 1000);

    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
            getWorkspaceFolders()[0],
            "vendor/composer/autoload_*.php",
        ),
    );

    watcher.onDidChange(onChange);
    watcher.onDidCreate(onChange);
    watcher.onDidDelete(onChange);

    registerWatcher(watcher);
};

export const createFileWatcher = (
    patterns: string | string[],
    callback: (e: vscode.Uri) => void,
    events: FileEvent[] = defaultFileEvents,
    reloadOnComposerChanges: boolean = true,
): vscode.FileSystemWatcher[] => {
    if (!hasWorkspace()) {
        return [];
    }

    patterns = typeof patterns === "string" ? [patterns] : patterns;

    return patterns.map((pattern) => {
        if (patternWatchers[pattern]) {
            patternWatchers[pattern].callbacks.push({
                callback,
                events,
                reloadOnComposerChanges,
            });

            return patternWatchers[pattern].watcher;
        }

        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(getWorkspaceFolders()[0], pattern),
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
            callbacks: [{ callback, events, reloadOnComposerChanges }],
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
