import { repository } from ".";
import { runInLaravel, template } from "../support/php";

type AppBindingItem = {
    [key: string]: {
        class: string;
        path: string;
        line: number;
    };
};

export const getAppBindings = repository<AppBindingItem>({
    load: () => {
        return runInLaravel<AppBindingItem>(template("app"), "App Bindings");
    },
    pattern: "app/Providers/{,*,**/*}.php",
    itemsDefault: {},
});
