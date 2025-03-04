import { runInLaravel, template } from "@src/support/php";
import { repository } from ".";

export interface BladeComponents {
    [key: string]: {
        paths: string[];
        isVendor: boolean;
    };
}

const load = () => {
    return runInLaravel<BladeComponents>(template("bladeComponents"));
};

export const getBladeComponents = repository<BladeComponents>(
    load,
    "{,**/}{view,views}/{*,**/*}",
    {},
    ["create", "delete"],
);
