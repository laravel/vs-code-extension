import * as vscode from "vscode";

import { getProjectWorkspaceFolder } from "@src/support/project";
import { sendLspRequest } from "./client";

export interface PathItem {
    key: string;
    path: string;
}

export const getPaths = (
    workspaceFolder: vscode.WorkspaceFolder = getProjectWorkspaceFolder()!,
): Promise<PathItem[]> => {
    return sendLspRequest<PathItem[]>(
        "laravel/data",
        {
            name: "paths",
        },
        workspaceFolder,
    );
};
