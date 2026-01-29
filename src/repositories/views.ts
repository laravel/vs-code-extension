import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export interface ViewItem {
    key: string;
    path: string;
    isVendor: boolean;
    livewire?: {
        props: {
            name: string;
            type: string;
            hasDefaultValue: boolean;
            defaultValue: string;
        }[];
        files: string[];
    };
}

const load = () => {
    return runInLaravel<ViewItem[]>(template("views"));
};

export const getViews = repository<ViewItem[]>({
    load,
    pattern: inAppDirs("{,**/}{view,views}/{*,**/*}"),
    itemsDefault: [],
    fileWatcherEvents: ["create", "delete", "change"],
});
