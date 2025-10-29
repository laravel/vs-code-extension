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

export const getViewItemByKey = (key: string, isLivewire: boolean) => {
    key = key.replaceAll("⚡", "");

    const filenames = [key];

    if (isLivewire) {
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
    }

    return getViews().items.find((view) => {
        return filenames.includes(view.key);
    });
};

export const getLivewireViewItems = (
    componentNamespaces?: string[] | undefined,
) => {
    return (
        getViews()
            .items.filter((view) =>
                componentNamespaces
                    ? componentNamespaces.some((componentNamespace) =>
                          view.key.startsWith(componentNamespace),
                      )
                    : true,
            )
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
