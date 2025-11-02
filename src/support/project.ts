import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { config } from "./config";
import { getPhpEnv, isPhpEnv } from "./php";

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

export const pathForPhpEnv = (srcPath: string): string => {
    if (isPhpEnv("ddev")) {
        return srcPath.replace(new RegExp("^/var/www/html/"), "");
    }

    if (srcPath.match(/^\//) && getPhpEnv() === "docker") {
        const dockerBase = config<string>("dockerBase", "/app").replace(
            /\/$/,
            "",
        );
        return projectPath(srcPath.replace(new RegExp(`^${dockerBase}/?`), ""));
    }

    return srcPath;
};

export const basePath = (srcPath = ""): string => {
    return path.join(config<string>("basePath", ""), pathForPhpEnv(srcPath));
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
