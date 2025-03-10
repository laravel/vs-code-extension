import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface CustomDirectiveItem {
    name: string;
    hasParams: boolean;
}

export const getCustomBladeDirectives = repository<CustomDirectiveItem[]>({
    load: () =>
        runInLaravel<CustomDirectiveItem[]>(
            template("bladeDirectives"),
            "Custom Blade Directives",
        ),
    pattern: "app/{,*,**/*}Provider.php",
    itemsDefault: [],
});
