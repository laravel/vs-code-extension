import * as vscode from "vscode";

import { resolveWorkspaceProjectFolder } from "@src/support/project";
import { sendLspRequest } from "./client";

interface ModelItem {
    class: string;
}

type Models = Record<string, ModelItem>;

export const getModels = (
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<Models> => {
    return sendLspRequest<Models>(
        "laravel/data",
        {
            name: "models",
        },
        workspaceFolder,
    );
};

export const getModelClassnames = async (
    workspaceFolder: vscode.WorkspaceFolder = resolveWorkspaceProjectFolder()!,
): Promise<Record<string, string>> => {
    return Object.fromEntries(
        Object.values(await getModels(workspaceFolder)).map((model) => [
            model.class,
            model.class,
        ]),
    );
};
