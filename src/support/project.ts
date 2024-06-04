import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { config } from "./config";

export const projectPath = (relativePath = "", forCode = false): string => {
    if (relativePath[0] === "/") {
        relativePath = relativePath.substr(1);
    }

    let basePath = config<string>("basePath", "");

    if (forCode === false && basePath.length > 0) {
        if (basePath.startsWith(".") && hasWorkspace()) {
            basePath = path.resolve(
                getWorkspaceFolders()[0].uri.fsPath,
                basePath,
            );
        }

        return basePath.replace(/[\/\\]$/, "") + "/" + relativePath;
    }

    let basePathForCode = config<string>("basePathForCode", "");

    if (forCode && basePathForCode.length > 0) {
        if (basePathForCode.startsWith(".") && hasWorkspace()) {
            basePathForCode = path.resolve(
                getWorkspaceFolders()[0].uri.fsPath,
                basePathForCode,
            );
        }

        return basePathForCode.replace(/[\/\\]$/, "") + "/" + relativePath;
    }

    for (let workspaceFolder of getWorkspaceFolders()) {
        if (fs.existsSync(`${workspaceFolder.uri.fsPath}/artisan`)) {
            return `${workspaceFolder.uri.fsPath}/${relativePath}`;
        }
    }

    return "";
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
