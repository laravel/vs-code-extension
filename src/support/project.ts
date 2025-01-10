import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { config } from "./config";

let internalVendorExists: boolean | null = null;

export const setInternalVendorExists = (value: boolean) => {
    internalVendorExists = value;
};

export const internalVendorPath = (subPath = ""): string => {
    const baseDir = path.join("vendor", "_laravel_ide");

    if (internalVendorExists !== true) {
        const baseVendorDir = projectPath(baseDir);

        internalVendorExists = fs.existsSync(baseVendorDir);

        if (!internalVendorExists) {
            fs.mkdirSync(baseVendorDir, { recursive: true });
        }
    }

    return projectPath(`${baseDir}/${subPath}`);
};

const trimFirstSlash = (srcPath: string): string => {
    return srcPath[0] === path.sep ? srcPath.substring(1) : srcPath;
};

export const projectPath = (srcPath = ""): string => {
    const basePath = config<string>("basePath", "");

    for (let workspaceFolder of getWorkspaceFolders()) {
        if (
            fs.existsSync(
                path.join(workspaceFolder.uri.fsPath, basePath, "artisan"),
            )
        ) {
            return path.join(workspaceFolder.uri.fsPath, basePath, srcPath);
        }
    }

    return "";
};

export const relativePath = (srcPath: string): string => {
    for (let workspaceFolder of getWorkspaceFolders()) {
        if (srcPath.startsWith(workspaceFolder.uri.fsPath)) {
            return trimFirstSlash(
                srcPath.replace(workspaceFolder.uri.fsPath, ""),
            );
        }
    }

    return srcPath;
};

const resolvePath = (basePath: string, relativePath: string): string => {
    if (basePath.startsWith(".") && hasWorkspace()) {
        basePath = path.resolve(getWorkspaceFolders()[0].uri.fsPath, basePath);
    }

    return path.join(basePath, relativePath);
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
