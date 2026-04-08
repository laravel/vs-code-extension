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
    let reloaded = false;

    loadAndWatch(
        () => {
            load()
                .then((result) => {
                    if (typeof result === "undefined") {
                        throw new Error("Failed to load items");
                    }

                    items = result;
                    loaded = true;
                    reloaded = true;
                })
                .catch((e) => {
                    console.error(e);
                });
        },
        pattern,
        fileWatcherEvents,
        reloadOnComposerChanges,
    );

    const waitForValue =
        (value: () => boolean, maxTries = 20) =>
        async (callback: (items: T) => any) => {
            let tries = 0;

            while (!value() && tries < maxTries) {
                tries++;
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            if (value()) {
                return callback(items);
            }
        };

    const whenLoaded = waitForValue(() => loaded);
    const whenReloaded = waitForValue(() => reloaded);

    return () => {
        reloaded = false;

        return {
            loaded,
            items,
            whenLoaded,
            whenReloaded,
        };
    };
};
