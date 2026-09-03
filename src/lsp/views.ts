import * as vscode from "vscode";

import { resolveWorkspaceProjectFolder } from "@src/support/project";
import { sendLspRequest } from "./client";

export interface ViewItem {
    key: string;
    path: string;
    isVendor: boolean;
    livewire?: {
        props: {
            name: string;
            type: string;
            hasDefaultValue: boolean;
            defaultValue: string;
        }[];
        files: string[];
    };
}

export const getViews = (
    workspaceFolder: vscode.WorkspaceFolder = resolveWorkspaceProjectFolder()!,
): Promise<ViewItem[]> => {
    return sendLspRequest<ViewItem[]>(
        "laravel/data",
        {
            name: "views",
        },
        workspaceFolder,
    );
};
