import * as fs from "fs";
import * as vscode from "vscode";
import { View } from "..";
import { loadAndWatch } from "../support/fileWatcher";
import { runInLaravel } from "../support/php";
import { projectPath } from "../support/project";

let views: {
    [key: string]: View;
} = {};

const load = () => {
    runInLaravel<{
        paths: string[];
        hints: { [key: string]: string[] };
    }>(`
            echo json_encode([
                'paths' => app('view')->getFinder()->getPaths(),
                'hints' => app('view')->getFinder()->getHints(),
            ]);
            `).then((results) => {
        results.paths
            .map((path: string) =>
                path.replace(projectPath("/", true), projectPath("/")),
            )
            .forEach((path: string) => {
                collectViews(path).forEach((view) => {
                    views[view.name] = view;
                });
            });

        Object.entries(results.hints).forEach(([namespace, viewNamespaces]) => {
            viewNamespaces
                .map((path) =>
                    path.replace(projectPath("/", true), projectPath("/")),
                )
                .forEach((path) => {
                    collectViews(path).forEach((view) => {
                        views[`${namespace}::${view.name}`] = view;
                    });
                });
        });
    });
};

const collectViews = (path: string): View[] => {
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
                return collectViews(`${path}/${file}`);
            }

            if (!file.includes("blade.php")) {
                return [];
            }

            const name = file.replace(".blade.php", "");

            return {
                name,
                relativePath: `${path}/${name}`.replace(projectPath(""), ""),
                uri: vscode.Uri.file(`${path}/${file}`),
            };
        })
        .flat();
};

loadAndWatch(load, "{,**/}{view,views}/{*,**/*}", ["create", "delete"]);

export const getViews = () => views;
