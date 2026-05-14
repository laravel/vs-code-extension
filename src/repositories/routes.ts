import { inAppDirs } from "@src/support/fileWatcher";
import * as vscode from "vscode";
import { repository } from ".";
import { runInLaravel, template } from "../support/php";

export interface RouteItem {
    method: string;
    uri: string;
    name: string;
    action: string;
    parameters: string[];
    filename: string | null;
    line: number | null;
    livewire: string | null;
}

const routesPattern = "{[Rr]oute}{,s}{.php,/*.php,/**/*.php}";

export const getRoutes = repository<RouteItem[]>({
    load: (workspaceFolder: vscode.WorkspaceFolder) => {
        return runInLaravel<RouteItem[]>(
            template("routes"),
            workspaceFolder,
            "HTTP Routes",
        );
    },
    pattern: [inAppDirs(`{,**/}${routesPattern}`), routesPattern],
    itemsDefault: [],
});
