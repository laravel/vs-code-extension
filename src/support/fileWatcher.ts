import { readdirSync } from "fs";
import * as vscode from "vscode";
import { debounce, leadingDebounce } from "./util";
import {
    getFirstWorkspaceFolder,
    getLaravelWorkspaceFolders,
    getWorkspaceFolder,
} from "./workspace";

export type FileEvent = "change" | "create" | "delete";

let watchers: vscode.FileSystemWatcher[] = [];

export type WatcherPattern =
    | string
    | string[]
    | ((
          workspaceFolder: vscode.WorkspaceFolder,
      ) => Promise<string | string[] | null>);

export const defaultFileEvents: FileEvent[] = ["change", "create", "delete"];

export const loadAndWatch = (
    load: (workspaceFolder: vscode.WorkspaceFolder) => void,
    patterns: WatcherPattern,
    events: FileEvent[] = defaultFileEvents,
    workspaceFolder: vscode.WorkspaceFolder,
    reloadOnComposerChanges: boolean = true,
): void => {
    load(workspaceFolder);

    const loadFunc = leadingDebounce(() => load(workspaceFolder), 1000);

    if (patterns instanceof Function) {
        patterns(workspaceFolder).then((result) => {
            if (result !== null) {
                createFileWatcher(
                    result,
                    loadFunc,
                    events,
                    workspaceFolder,
                    reloadOnComposerChanges,
                );
            }
        });
    } else {
        createFileWatcher(
            patterns,
            loadFunc,
            events,
            workspaceFolder,
            reloadOnComposerChanges,
        );
    }
};

let appDirsRead = false;
const appDirs: string[] = [];
const ignoreDirs = ["node_modules", ".git", "vendor", "storage"];

export const inAppDirs = (pattern: string) => {
    if (!appDirsRead) {
        appDirsRead = true;
        readdirSync(getWorkspaceFolder()!.uri.fsPath, {
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

    getLaravelWorkspaceFolders().forEach((workspaceFolder) => {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(
                workspaceFolder,
                "vendor/composer/autoload_*.php",
            ),
        );

        watcher.onDidChange(onChange);
        watcher.onDidCreate(onChange);
        watcher.onDidDelete(onChange);

        registerWatcher(watcher);
    });
};

export const createFileWatcher = (
    patterns: string | string[],
    callback: (e: vscode.Uri) => void,
    events: FileEvent[] = defaultFileEvents,
    workspaceFolder:
        | vscode.WorkspaceFolder
        | undefined = getFirstWorkspaceFolder(),
    reloadOnComposerChanges: boolean = true,
): vscode.FileSystemWatcher[] => {
    if (!workspaceFolder) {
        return [];
    }

    patterns = typeof patterns === "string" ? [patterns] : patterns;

    return patterns.map((pattern) => {
        const key = [workspaceFolder.name, pattern].join(":");

        if (patternWatchers[key]) {
            patternWatchers[key].callbacks.push({
                callback,
                events,
                reloadOnComposerChanges,
            });

            return patternWatchers[key].watcher;
        }

        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceFolder, pattern),
        );

        watcher.onDidChange((...args) => {
            patternWatchers[key].callbacks.forEach((cb) => {
                if (cb.events.includes("change")) {
                    cb.callback(...args);
                }
            });
        });

        watcher.onDidCreate((...args) => {
            patternWatchers[key].callbacks.forEach((cb) => {
                if (cb.events.includes("create")) {
                    cb.callback(...args);
                }
            });
        });

        watcher.onDidDelete((...args) => {
            patternWatchers[key].callbacks.forEach((cb) => {
                if (cb.events.includes("delete")) {
                    cb.callback(...args);
                }
            });
        });

        patternWatchers[key] = {
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

    for (const pattern in patternWatchers) {
        delete patternWatchers[pattern];
    }
};
