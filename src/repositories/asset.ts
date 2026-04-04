import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { repository } from ".";
import { projectPath, relativePath } from "../support/project";

interface Item {
    path: string;
    uri: vscode.Uri;
}

const getFilesInDirectory = (
    dir: string,
    workspaceFolder: vscode.WorkspaceFolder,
    depth: number = 0,
): Item[] => {
    let dirFullPath = projectPath(dir, workspaceFolder);

    if (!fs.existsSync(dirFullPath)) {
        return [];
    }

    if (depth > 10) {
        return [];
    }

    return fs
        .readdirSync(dirFullPath)
        .map((filePath) => {
            let fullFilePath = `${dirFullPath}/${filePath}`;
            let shortFilePath = `${dir}/${filePath}`;
            let stat = fs.lstatSync(fullFilePath);

            if (stat.isDirectory()) {
                return getFilesInDirectory(
                    shortFilePath,
                    workspaceFolder,
                    depth + 1,
                );
            }

            if (
                stat.isFile() &&
                filePath[0] !== ".." &&
                filePath.endsWith(".php") === false
            ) {
                return [
                    {
                        path: relativePath(
                            fullFilePath.replace(/[\/\\]/g, path.sep),
                        )
                            .replace("public" + path.sep, "")
                            .replaceAll(path.sep, "/"),
                        uri: vscode.Uri.file(fullFilePath),
                    },
                ];
            }

            return [];
        })
        .flat();
};

export const getAssets = repository<Item[]>({
    load: (workspaceFolder: vscode.WorkspaceFolder) =>
        new Promise((resolve, reject) => {
            try {
                resolve(getFilesInDirectory("public", workspaceFolder));
            } catch (exception) {
                reject(exception);
            }
        }),
    pattern: "public/**/*",
    itemsDefault: [],
    reloadOnComposerChanges: false,
});
