import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export interface BladeComponents {
    components: {
        [key: string]: {
            paths: string[];
            isVendor: boolean;
        };
    };
    prefixes: string[];
}

const load = () => {
    return runInLaravel<BladeComponents>(template("bladeComponents"));
};

export const getBladeComponents = repository<BladeComponents>(
    load,
    "{,**/}{view,views}/{*,**/*}",
    {
        components: {},
        prefixes: [],
    },
    ["create", "delete"],
);
