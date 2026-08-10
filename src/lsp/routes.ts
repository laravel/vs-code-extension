import * as vscode from "vscode";

import { getProjectWorkspaceFolder } from "@src/support/project";
import { sendLspRequest } from "./client";

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

export const getRoutes = (
    workspaceFolder: vscode.WorkspaceFolder = getProjectWorkspaceFolder()!,
): Promise<RouteItem[]> => {
    return sendLspRequest<RouteItem[]>(
        "laravel/data",
        {
            name: "routes",
        },
        workspaceFolder,
    );
};
