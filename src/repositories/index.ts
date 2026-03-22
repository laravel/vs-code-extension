import { getWorkspaceFolders, workspacePath } from "@src/support/project";
import * as vscode from "vscode";
import {
    type FileEvent,
    WatcherPattern,
    defaultFileEvents,
    loadAndWatch,
} from "../support/fileWatcher";

export const repository = <T>({
    load,
    pattern,
    itemsDefault,
    fileWatcherEvents = defaultFileEvents,
    reloadOnComposerChanges = true,
}: {
    load: (workspaceFolder: vscode.WorkspaceFolder) => Promise<T>;
    pattern: WatcherPattern;
    itemsDefault: T;
    fileWatcherEvents?: FileEvent[];
    reloadOnComposerChanges?: boolean;
}) => {
    let items: Record<string, T> = {};
    let loaded: Record<string, boolean> = {};

    for (let workspaceFolder of getWorkspaceFolders()) {
        items[workspaceFolder.uri.fsPath] = itemsDefault;
        loaded[workspaceFolder.uri.fsPath] = false;

        loadAndWatch(
            (workspaceFolder: vscode.WorkspaceFolder) => {
                load(workspaceFolder)
                    .then((result) => {
                        if (typeof result === "undefined") {
                            throw new Error("Failed to load items");
                        }

                        items[workspaceFolder.uri.fsPath] = result;
                        loaded[workspaceFolder.uri.fsPath] = true;
                    })
                    .catch((e) => {
                        console.error(e);
                    });
            },
            pattern,
            fileWatcherEvents,
            workspaceFolder,
            reloadOnComposerChanges,
        );
    }

    const whenLoaded = async (callback: (items: T) => any, maxTries = 20) => {
        const path = workspacePath();

        let tries = 0;

        while (!loaded[path] && tries < maxTries) {
            tries++;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (loaded[path]) {
            return callback(items[path]);
        }
    };

    return () => {
        const path = workspacePath();

        return {
            loaded: loaded[path],
            items: items[path],
            whenLoaded,
        };
    };
};
