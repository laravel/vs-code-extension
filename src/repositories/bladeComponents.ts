import { inAppDirs } from "@src/support/fileWatcher";
import { runInLaravel, template } from "@src/support/php";
import * as vscode from "vscode";
import { repository } from ".";

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

const load = (workspaceFolder: vscode.WorkspaceFolder) => {
    return runInLaravel<BladeComponents>(
        template("bladeComponents"),
        workspaceFolder,
    );
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
    fileWatcherEvents: ["create", "delete", "change"],
});
