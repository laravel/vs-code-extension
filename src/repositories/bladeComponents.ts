import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export const patterns = {
    bladeFiles: inAppDirs("{,**/}{view,views}/{*,**/*}.blade.php"),
    classFiles: "app/View/Components/{,*,**/*}.php",
};

export interface BladeComponents {
    components: {
        [key: string]: {
            paths: string[];
            isVendor: boolean;
            props:
                | {
                      name: string;
                      type: string;
                      default: string | null;
                  }[]
                | string;
        };
    };
    prefixes: string[];
}

const load = () => {
    return runInLaravel<BladeComponents>(template("bladeComponents"));
};

export const getBladeComponents = repository<BladeComponents>({
    load,
    pattern: Object.values(patterns),
    itemsDefault: {
        components: {},
        prefixes: [],
    },
    fileWatcherEvents: ["create", "delete", "change"],
});
