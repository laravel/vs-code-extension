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

export const resolveWorkspaceProjectFolder = (
    workspaceFolder: vscode.WorkspaceFolder,
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

export const getProjectWorkspaceFolder = ():
    | vscode.WorkspaceFolder
    | undefined => {
    const workspaceFolder = getWorkspaceFolders()[0];

    if (!workspaceFolder) {
        return undefined;
    }

    return resolveWorkspaceProjectFolder(workspaceFolder);
};

export const projectPath = (srcPath = ""): string => {
    srcPath = basePath(srcPath);

    for (let workspaceFolder of getWorkspaceFolders()) {
        if (
            fs.existsSync(
                path.join(workspaceFolder.uri.fsPath, basePath("artisan")),
            )
        ) {
            return path.join(workspaceFolder.uri.fsPath, srcPath);
        }

        if (fs.existsSync(path.join(workspaceFolder.uri.fsPath, srcPath))) {
            return path.join(workspaceFolder.uri.fsPath, srcPath);
        }
    }

    return "";
};

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

export const hasWorkspace = (): boolean => {
    return (
        vscode.workspace.workspaceFolders instanceof Array &&
        vscode.workspace.workspaceFolders.length > 0
    );
};

export const getWorkspaceFolders = () =>
    vscode.workspace.workspaceFolders || [];

export const projectPathExists = (path: string): boolean => {
    return fs.existsSync(projectPath(path));
};

export const readFileInProject = (path: string): string => {
    return fs.readFileSync(projectPath(path), "utf8");
};
