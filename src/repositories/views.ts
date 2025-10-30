import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export interface ViewItem {
    key: string;
    path: string;
    isLivewire: boolean;
    isVendor: boolean;
}

const load = () => {
    return runInLaravel<
        {
            key: string;
            path: string;
            isLivewire: boolean;
            isVendor: boolean;
        }[]
    >(template("views")).then((results) => {
        return results.map(({ key, path, isVendor, isLivewire }) => {
            return {
                key,
                path,
                isLivewire,
                isVendor,
            };
        });
    });
};

export const getViewItemByKey = (key: string) => {
    key = key.replaceAll("⚡", "");

    const filenames = [key];

    let [prefix, viewKey] = key.split("::");

    if (!viewKey) {
        viewKey = prefix;
        prefix = "";
    }

    const parts = viewKey.split(".");
    const filename = parts[parts.length - 1];

    if (filename) {
        parts[parts.length - 1] = `⚡${filename}`;
    }

    let keyWithEmoji = parts.join(".");

    if (prefix) {
        keyWithEmoji = `${prefix}::${keyWithEmoji}`;
    }

    filenames.push(
        // Support for emoji
        keyWithEmoji,
        // Support for mfc and mfc with emoji
        `${key}.${filename}`,
        `${keyWithEmoji}.${filename}`,
    );

    return getViews().items.find((view) => {
        if (view.isLivewire) {
            return filenames.includes(view.key);
        }

        return view.key === key;
    });
};

export const getLivewireViewItems = () => {
    return (
        getViews()
            .items.filter((view) => view.isLivewire)
            // Mfc components have .php file and .blade.php. We don't want to show
            // both files in the completion
            .filter((view) => {
                const hasMfcView = getViews().items.some(
                    (mfcView) => mfcView.key === view.key && mfcView !== view,
                );

                return !(hasMfcView && view.path.endsWith(".blade.php"));
            })
            // Mfc components link to the component file using the directory name
            .map((view) => {
                let [prefix, viewKey] = view.key.split("::");

                if (!viewKey) {
                    viewKey = prefix;
                    prefix = "";
                }

                const parts = viewKey.split(".");
                const filename = parts.at(-1);
                const directory = parts.at(-2);

                if (
                    directory &&
                    filename === directory.replace("⚡", "") &&
                    !view.path.endsWith(".blade.php") &&
                    view.path.endsWith(".php")
                ) {
                    const mfcView = { ...view };
                    mfcView.key = view.key.replace(`.${filename}`, "");

                    return mfcView;
                }

                return view;
            })
    );
};

export const getViews = repository<ViewItem[]>({
    load,
    pattern: inAppDirs("{,**/}{view,views}/{*,**/*}"),
    itemsDefault: [],
    fileWatcherEvents: ["create", "delete"],
});
