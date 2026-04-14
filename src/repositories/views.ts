import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export const patterns = {
    bladeFiles: inAppDirs("{,**/}{view,views}/{*,**/*}"),
    livewireFiles: "app/Livewire/{,*,**/*}.php",
};

export interface Views {
    views: ViewItem[];
    livewirePaths: string[];
}

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
    return runInLaravel<Views>(template("views"));
};

export const getViews = repository<Views>({
    load,
    pattern: Object.values(patterns),
    itemsDefault: {
        views: [],
        livewirePaths: [],
    },
    fileWatcherEvents: ["create", "delete", "change"],
});
