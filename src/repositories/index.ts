import {
    getLaravelWorkspaceFolders,
    getWorkspaceFolder,
} from "@src/support/workspace";
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

    getLaravelWorkspaceFolders().forEach((workspaceFolder) => {
        items[workspaceFolder.name] = itemsDefault;
        loaded[workspaceFolder.name] = false;

        loadAndWatch(
            (workspaceFolder: vscode.WorkspaceFolder) => {
                load(workspaceFolder)
                    .then((result) => {
                        if (typeof result === "undefined") {
                            throw new Error("Failed to load items");
                        }

                        items[workspaceFolder.name] = result;
                        loaded[workspaceFolder.name] = true;
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
    });

    const whenLoaded = async (callback: (items: T) => any, maxTries = 20) => {
        const workspace = getWorkspaceFolder()!;

        let tries = 0;

        while (!loaded[workspace.name] && tries < maxTries) {
            tries++;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (loaded[workspace.name]) {
            return callback(items[workspace.name]);
        }
    };

    return () => {
        const workspace = getWorkspaceFolder()!;

        return {
            loaded: loaded[workspace.name],
            items: items[workspace.name],
            whenLoaded,
        };
    };
};
