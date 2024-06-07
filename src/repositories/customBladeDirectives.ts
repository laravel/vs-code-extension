import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface CustomDirectiveItem {
    name: string;
    hasParams: boolean;
}

export const getCustomBladeDirectives = repository<CustomDirectiveItem[]>(
    () =>
        runInLaravel<CustomDirectiveItem[]>(
            template("blade-directives"),
            "Custom Blade Directives",
        ),
    "app/{,*,**/*}Provider.php",
    [],
);
