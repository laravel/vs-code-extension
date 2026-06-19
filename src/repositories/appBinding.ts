import * as vscode from "vscode";
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
    load: (workspaceFolder: vscode.WorkspaceFolder) => {
        return runInLaravel<AppBindingItem>(
            template("app"),
            workspaceFolder,
            "App Bindings",
        );
    },
    pattern: "app/Providers/{,*,**/*}.php",
    itemsDefault: {},
});
