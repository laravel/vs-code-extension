import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { basePath } from "./project";

export const getWorkspaceFolder = (
    uri?: vscode.Uri | undefined,
): vscode.WorkspaceFolder | undefined => {
    // Case when we know the file URI and we want to get the VSCode workspace folder for it.
    // Useful for Laravel artisan commands in the VSCode file explorer
    if (uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (workspaceFolder) {
            return workspaceFolder;
        }
    }

    // Case when we don't know the file URI but we have an active text editor,
    // so we try to get the workspace folder from it
    if (vscode.window.activeTextEditor) {
        const fileUri = vscode.window.activeTextEditor.document.uri;

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);

        if (workspaceFolder) {
            return workspaceFolder;
        }
    }

    // Fallback, just return the first workspace folder if it exists
    return getFirstWorkspaceFolder();
};

export const getFirstWorkspaceFolder = (): vscode.WorkspaceFolder | undefined =>
    getWorkspaceFolders()?.[0];

export const getWorkspaceFolders = (): readonly vscode.WorkspaceFolder[] =>
    vscode.workspace.workspaceFolders || [];

export const getLaravelWorkspaceFolders =
    (): readonly vscode.WorkspaceFolder[] => {
        return getWorkspaceFolders().filter((workspaceFolder) =>
            fs.existsSync(
                path.join(workspaceFolder.uri.fsPath, basePath("artisan")),
            ),
        )!;
    };

export const hasWorkspace = (): boolean => {
    return (
        getWorkspaceFolders() instanceof Array &&
        getWorkspaceFolders().length > 0
    );
};
