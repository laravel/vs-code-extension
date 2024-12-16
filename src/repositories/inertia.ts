import * as fs from "fs";
import * as vscode from "vscode";
import { repository } from ".";
import { View } from "..";
import { projectPath, relativePath } from "./../support/project";

interface ViewItem {
    [key: string]: View;
}

const config = vscode.workspace.getConfiguration();
const viewsPath = config.get<string>(
    "inertia.viewsPath",
    "/resources/js/Pages"
);

const load = () => {
    let views: ViewItem = {};

    [viewsPath].forEach((path) => {
      collectViews(projectPath(path), path).forEach((view) => {
        views[view.name] = view;
      });
    });

    return views;
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

            if (!file.match(/\.vue|\.tsx|\.jsx|\.svelte$/)) {
                return [];
            }

            const name = file.replace(/\.(vue|tsx|jsx|svelte)$/, "");

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

export const getInertiaViews = repository<ViewItem>(
    () => new Promise((resolve) => resolve(load())),
    `{,**/}{${viewsPath.replace(/^\//, '')}}/{*,**/*}`,
    {},
    ["create", "delete"],
);
