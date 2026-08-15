import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { config } from "./config";

const trimFirstSlash = (srcPath: string): string => {
    return srcPath[0] === path.sep ? srcPath.substring(1) : srcPath;
};

export const pathForPhpEnv = (srcPath: string): string => {
    return srcPath;
};

export const basePath = (srcPath = ""): string => {
    return path.join(config<string>("basePath", ""), pathForPhpEnv(srcPath));
};

export const resolveWorkspaceProjectPath = (
    workspaceFolder: vscode.WorkspaceFolder,
    configuredBasePath = config<string>("basePath", ""),
): string => {
    return path.resolve(workspaceFolder.uri.fsPath, configuredBasePath);
};

export const resolveWorkspaceProjectFolders = (): vscode.WorkspaceFolder[] =>
    getProjectWorkspaceFolders().map((workspaceFolder) =>
        resolveWorkspaceProjectFolder(workspaceFolder),
    );

export const resolveWorkspaceProjectFolder = (
    workspaceFolder: vscode.WorkspaceFolder = getProjectWorkspaceFolder()!,
    configuredBasePath = config<string>("basePath", ""),
): vscode.WorkspaceFolder => {
    const projectPath = resolveWorkspaceProjectPath(
        workspaceFolder,
        configuredBasePath,
    );

    if (projectPath === workspaceFolder.uri.fsPath) {
        return workspaceFolder;
    }

    return {
        uri: vscode.Uri.file(projectPath),
        name: path.basename(projectPath),
        index: workspaceFolder.index,
    };
};

export const getProjectWorkspaceFolder = (
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
    return getFirstProjectWorkspaceFolder();
};

export const getWorkspaceFolders = (): readonly vscode.WorkspaceFolder[] =>
    vscode.workspace.workspaceFolders || [];

const getProjectWorkspaceFolders = (): vscode.WorkspaceFolder[] => {
    return getWorkspaceFolders().filter((workspaceFolder) =>
        fs.existsSync(
            path.join(workspaceFolder.uri.fsPath, basePath("artisan")),
        ),
    )!;
};

const getFirstProjectWorkspaceFolder = (): vscode.WorkspaceFolder | undefined =>
    getProjectWorkspaceFolders()?.[0];

export const hasWorkspace = (): boolean => {
    return (
        getWorkspaceFolders() instanceof Array &&
        getWorkspaceFolders().length > 0
    );
};

export const projectPath = (
    srcPath = "",
    workspaceFolder: vscode.WorkspaceFolder = resolveWorkspaceProjectFolder()!,
): string => path.join(workspaceFolder.uri.fsPath, srcPath);

export const relativePath = (srcPath: string): string => {
    for (let workspaceFolder of getWorkspaceFolders()) {
        if (srcPath.startsWith(workspaceFolder.uri.fsPath)) {
            return trimFirstSlash(
                srcPath.replace(
                    path.join(workspaceFolder.uri.fsPath, basePath()),
                    "",
                ),
            );
        }
    }

    return srcPath;
};

export const projectPathExists = (
    path: string,
    workspaceFolder?: vscode.WorkspaceFolder,
): boolean => {
    return fs.existsSync(projectPath(path, workspaceFolder));
};

export const readFileInProject = (
    path: string,
    workspaceFolder?: vscode.WorkspaceFolder,
): string => {
    return fs.readFileSync(projectPath(path, workspaceFolder), "utf8");
};
