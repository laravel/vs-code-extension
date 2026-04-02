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
    load: () => Promise<T>;
    pattern: WatcherPattern;
    itemsDefault: T;
    fileWatcherEvents?: FileEvent[];
    reloadOnComposerChanges?: boolean;
}) => {
    let items: T = itemsDefault;
    let loaded = false;
    let refreshed = false;

    loadAndWatch(
        () => {
            load()
                .then((result) => {
                    if (typeof result === "undefined") {
                        throw new Error("Failed to load items");
                    }

                    items = result;
                    loaded = true;
                    refreshed = true;
                })
                .catch((e) => {
                    console.error(e);
                });
        },
        pattern,
        fileWatcherEvents,
        reloadOnComposerChanges,
    );

    const waitForFlag =
        (flag: () => boolean, maxTries = 20) =>
        async (callback: (items: T) => any) => {
            let tries = 0;

            while (!flag() && tries < maxTries) {
                tries++;
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            if (flag()) {
                return callback(items);
            }
        };

    const whenLoaded = waitForFlag(() => loaded);
    const whenRefreshed = waitForFlag(() => refreshed);

    return () => {
        refreshed = false;

        return {
            loaded,
            items,
            whenLoaded,
            whenRefreshed,
        };
    };
};
