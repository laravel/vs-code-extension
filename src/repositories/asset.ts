import * as fs from "fs";
import * as vscode from "vscode";
import { loadAndWatch } from "../support/fileWatcher";
import { projectPath, relativePath } from "../support/project";

interface Item {
    path: string;
    uri: vscode.Uri;
}

let items: Item[] = [];

const getFilesInDirectory = (dir: string, depth: number = 0): Item[] => {
    try {
        let dirFullPath = projectPath(dir);

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
                    return getFilesInDirectory(shortFilePath, depth + 1);
                }

                if (
                    stat.isFile() &&
                    filePath[0] !== ".." &&
                    filePath.endsWith(".php") === false
                ) {
                    return [
                        {
                            path: relativePath(fullFilePath).replace(
                                /\/?public\/?/g,
                                "",
                            ),
                            uri: vscode.Uri.file(fullFilePath),
                        },
                    ];
                }

                return [];
            })
            .flat();
    } catch (exception) {
        console.error(exception);

        return [];
    }
};

const load = () => {
    items = getFilesInDirectory("public");
};

loadAndWatch(load, "public/**/*");

export const getAssets = () => items;
