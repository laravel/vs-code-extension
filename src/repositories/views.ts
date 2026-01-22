import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export interface ViewItem {
    key: string;
    path: string;
    isVendor: boolean;
    isLivewire: boolean;
}

const load = () => {
    return runInLaravel<
        {
            key: string;
            path: string;
            isVendor: boolean;
            isLivewire: boolean;
        }[]
    >(template("views")).then((results) => {
        return results.map(({ key, path, isVendor, isLivewire }) => {
            return {
                key,
                path,
                isVendor,
                isLivewire,
            };
        });
    });
};

export const getViews = repository<ViewItem[]>({
    load,
    pattern: inAppDirs("{,**/}{view,views}/{*,**/*}"),
    itemsDefault: [],
    fileWatcherEvents: ["create", "delete"],
});
