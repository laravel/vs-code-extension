import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { config } from "./config";
import { isPhpEnv } from "./php";
import {
    getFirstWorkspaceFolder,
    getWorkspaceFolder,
    getWorkspaceFolders,
} from "./workspace";

let internalVendorExists: boolean | null = null;

export const setInternalVendorExists = (value: boolean) => {
    internalVendorExists = value;
};

export const internalVendorPath = (
    subPath = "",
    workspaceFolder: vscode.WorkspaceFolder = getFirstWorkspaceFolder()!,
): string => {
    const baseDir = path.join("vendor", "_laravel_ide");

    if (internalVendorExists !== true) {
        const baseVendorDir = path.join(workspaceFolder.uri.fsPath, baseDir);

        internalVendorExists = fs.existsSync(baseVendorDir);

        if (!internalVendorExists) {
            fs.mkdirSync(baseVendorDir, { recursive: true });
        }
    }

    return path.join(workspaceFolder.uri.fsPath, baseDir, subPath);
};

const trimFirstSlash = (srcPath: string): string => {
    return srcPath[0] === path.sep ? srcPath.substring(1) : srcPath;
};

export const pathForPhpEnv = (srcPath: string): string => {
    if (isPhpEnv("ddev")) {
        return srcPath.replace(new RegExp("^/var/www/html/"), "");
    }

    return srcPath;
};

export const basePath = (srcPath = ""): string => {
    return path.join(config<string>("basePath", ""), pathForPhpEnv(srcPath));
};

export const projectPath = (
    srcPath = "",
    workspaceFolder: vscode.WorkspaceFolder = getWorkspaceFolder()!,
): string => {
    srcPath = basePath(srcPath);

    return path.join(workspaceFolder.uri.fsPath, srcPath);
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

export const projectPathExists = (
    path: string,
    workspaceFolder: vscode.WorkspaceFolder = getWorkspaceFolder()!,
): boolean => {
    return fs.existsSync(projectPath(path, workspaceFolder));
};

export const readFileInProject = (
    path: string,
    workspaceFolder: vscode.WorkspaceFolder = getWorkspaceFolder()!,
): string => {
    return fs.readFileSync(projectPath(path, workspaceFolder), "utf8");
};
