import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export interface BladeComponents {
    components: {
        [key: string]: {
            paths: string[];
            isVendor: boolean;
            props: {
                name: string;
                type: string;
                default: string | null;
            }[];
        };
    };
    prefixes: string[];
}

const load = () => {
    return runInLaravel<BladeComponents>(template("bladeComponents"));
};

export const getBladeComponents = repository<BladeComponents>({
    load,
    pattern: [
        inAppDirs("{,**/}{view,views}/{*,**/*}"),
        "app/View/Components/{,*,**/*}.php",
    ],
    itemsDefault: {
        components: {},
        prefixes: [],
    },
    fileWatcherEvents: ["create", "delete"],
});
