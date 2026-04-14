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

    loadAndWatch(
        () => {
            load()
                .then((result) => {
                    if (typeof result === "undefined") {
                        throw new Error("Failed to load items");
                    }

                    items = result;
                    loaded = true;
                })
                .catch((e) => {
                    console.error(e);
                });
        },
        pattern,
        fileWatcherEvents,
        reloadOnComposerChanges,
    );

    const whenLoaded = async (callback: (items: T) => any, maxTries = 20) => {
        let tries = 0;

        while (!loaded && tries < maxTries) {
            tries++;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (loaded) {
            return callback(items);
        }
    };

    return () => ({
        loaded,
        items,
        whenLoaded,
    });
};
