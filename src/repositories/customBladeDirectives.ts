import * as vscode from "vscode";
import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface CustomDirectiveItem {
    name: string;
    hasParams: boolean;
}

export const getCustomBladeDirectives = repository<CustomDirectiveItem[]>({
    load: (workspaceFolder: vscode.WorkspaceFolder) =>
        runInLaravel<CustomDirectiveItem[]>(
            template("bladeDirectives"),
            workspaceFolder,
            "Custom Blade Directives",
        ),
    pattern: "app/{,*,**/*}Provider.php",
    itemsDefault: [],
});
