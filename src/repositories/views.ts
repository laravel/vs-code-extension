import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export interface ViewItem {
    key: string;
    path: string;
    isVendor: boolean;
}

const load = () => {
    return runInLaravel<
        {
            key: string;
            path: string;
            isVendor: boolean;
        }[]
    >(template("views")).then((results) => {
        return results.map(({ key, path, isVendor }) => {
            return {
                key,
                path,
                isVendor,
            };
        });
    });
};

export const getViewByName = (name: string, isLivewire: boolean) => {
    const filenames = [name];

    if (isLivewire) {
        const parts = name.split(".");
        const filename = parts[parts.length - 1];

        if (filename) {
            parts[parts.length - 1] = `⚡${filename}`;
        }

        const nameWithEmoji = parts.join(".");

        // Support for emoji and mfc components
        filenames.push(
            nameWithEmoji,
            `${name}.${filename}`,
            `${nameWithEmoji}.${filename}`,
        );
    }

    return getViews().items.find((view) => {
        return filenames.includes(view.key);
    });
};

export const getViews = repository<ViewItem[]>({
    load,
    pattern: inAppDirs("{,**/}{view,views}/{*,**/*}"),
    itemsDefault: [],
    fileWatcherEvents: ["create", "delete"],
});
