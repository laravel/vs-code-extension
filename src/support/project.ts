import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

let internalVendorExists: boolean | null = null;

export const internalVendorPath = (path = ""): string => {
    const baseDir = 'vendor/_laravel_ide';

    if (internalVendorExists !== true) {
        const baseVendorDir = projectPath(baseDir);

        internalVendorExists = fs.existsSync(baseVendorDir);

        if (!internalVendorExists) {
            fs.mkdirSync(baseVendorDir, { recursive: true });
        }

    }

    return projectPath(`${baseDir}/${path}`);
};

const normalizePath = (srcPath: string): string => {
    return srcPath.replace(/[\/\\]/g, path.sep);
};

export const projectPath = (srcPath = "", forCode = false): string => {
    if (srcPath[0] === path.sep) {
        srcPath = srcPath.substring(1);
    }

    let basePath = "";
    // let basePath = config<string>("basePath", "");

    if (forCode === false && basePath.length > 0) {
        return resolvePath(basePath, srcPath);
    }

    let basePathForCode = "";
    // let basePathForCode = config<string>("basePathForCode", "");

    if (forCode && basePathForCode.length > 0) {
        return resolvePath(basePathForCode, srcPath);
    }

    for (let workspaceFolder of getWorkspaceFolders()) {
        if (fs.existsSync(normalizePath(`${workspaceFolder.uri.fsPath}/artisan`))) {
            return normalizePath(`${workspaceFolder.uri.fsPath}/${srcPath}`);
        }
    }

    return "";
};

export const relativePath = (srcPath: string): string => {
    for (let workspaceFolder of getWorkspaceFolders()) {
        if (srcPath.startsWith(workspaceFolder.uri.fsPath)) {
            let tempPath = srcPath.replace(workspaceFolder.uri.fsPath, "");

            if (tempPath[0] === path.sep) {
                tempPath = tempPath.substring(1);
            }

            return tempPath;
        }
    }

    return srcPath;
};

const resolvePath = (basePath: string, relativePath: string): string => {
    if (basePath.startsWith(".") && hasWorkspace()) {
        basePath = path.resolve(getWorkspaceFolders()[0].uri.fsPath, basePath);
    }

    return normalizePath(`${basePath.replace(/[\/\\]$/, "")}/${relativePath}`);
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
