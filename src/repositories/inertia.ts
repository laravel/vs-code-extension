import * as fs from "fs";
import * as vscode from "vscode";
import { View } from "..";
import { createFileWatcher } from "../support/fileWatcher";
import { projectPath, relativePath } from "./../support/project";

let views: {
    [key: string]: View;
} = {};

const load = () => {
    ["/resources/js/Pages"].forEach((path) => {
        collectViews(projectPath(path), path).forEach((view) => {
            views[view.name] = view;
        });
    });
};

const collectViews = (path: string, basePath: string): View[] => {
    if (path.substring(-1) === "/" || path.substring(-1) === "\\") {
        path = path.substring(0, path.length - 1);
    }

    if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
        return [];
    }

    return fs
        .readdirSync(path)
        .map((file: string) => {
            if (fs.lstatSync(`${path}/${file}`).isDirectory()) {
                return collectViews(`${path}/${file}`, basePath);
            }

            if (!file.match(/\.vue|\.tsx|\.jsx$/)) {
                return [];
            }

            const name = file.replace(/\.(vue|tsx|jsx)$/, "");

            return {
                name: relativePath(`${path}/${name}`).replace(
                    basePath.substring(1) + "/",
                    "",
                ),
                relativePath: relativePath(`${path}/${file}`),
                uri: vscode.Uri.file(`${path}/${file}`),
            };
        })
        .flat();
};

load();

createFileWatcher("{,**/}{resources/js/Pages}/{*,**/*}", load, [
    "create",
    "delete",
]);

export const getInertiaViews = () => views;
