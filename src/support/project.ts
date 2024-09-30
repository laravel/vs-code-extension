import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export const internalVendorPath = (path = ""): string => {
    return projectPath(`vendor/_laravel_ide/${path}`);
};

export const ensureInternalVendorDirectoryExists = () => {
    let vendorPath = internalVendorPath();

    if (!fs.existsSync(vendorPath)) {
        fs.mkdirSync(vendorPath, { recursive: true });
    }
};

export const projectPath = (path = "", forCode = false): string => {
    if (path[0] === "/") {
        path = path.substring(1);
    }

    let basePath = "";
    // let basePath = config<string>("basePath", "");

    if (forCode === false && basePath.length > 0) {
        return resolvePath(basePath, path);
    }

    let basePathForCode = "";
    // let basePathForCode = config<string>("basePathForCode", "");

    if (forCode && basePathForCode.length > 0) {
        return resolvePath(basePathForCode, path);
    }

    for (let workspaceFolder of getWorkspaceFolders()) {
        if (fs.existsSync(`${workspaceFolder.uri.fsPath}/artisan`)) {
            return `${workspaceFolder.uri.fsPath}/${path}`;
        }
    }

    return "";
};

export const relativePath = (path: string): string => {
    for (let workspaceFolder of getWorkspaceFolders()) {
        if (path.startsWith(workspaceFolder.uri.fsPath)) {
            let tempPath = path.replace(workspaceFolder.uri.fsPath, "");

            if (tempPath[0] === "/") {
                tempPath = tempPath.substring(1);
            }

            return tempPath;
        }
    }

    return path;
};

const resolvePath = (basePath: string, relativePath: string): string => {
    if (basePath.startsWith(".") && hasWorkspace()) {
        basePath = path.resolve(getWorkspaceFolders()[0].uri.fsPath, basePath);
    }

    return `${basePath.replace(/[\/\\]$/, "")}/${relativePath}`;
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
