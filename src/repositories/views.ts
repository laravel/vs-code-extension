import { View } from "@src/index";
import { runInLaravel } from "@src/support/php";
import { projectPath } from "@src/support/project";
import * as fs from "fs";
import * as vscode from "vscode";
import { repository } from ".";

interface ViewItem {
    [key: string]: View;
}

const load = () => {
    return runInLaravel<{
        paths: string[];
        hints: { [key: string]: string[] };
    }>(`
    echo json_encode([
        'paths' => app('view')->getFinder()->getPaths(),
        'hints' => app('view')->getFinder()->getHints(),
    ]);
    `).then((results) => {
        let views: ViewItem = {};

        results.paths
            .map((path: string) =>
                path.replace(projectPath("/", true), projectPath("/")),
            )
            .forEach((path: string) => {
                collectViews(path, path).forEach((view) => {
                    views[view.name] = view;
                });
            });

        Object.entries(results.hints).forEach(([namespace, viewNamespaces]) => {
            viewNamespaces
                .map((path) =>
                    path.replace(projectPath("/", true), projectPath("/")),
                )
                .forEach((path) => {
                    collectViews(path, path).forEach((view) => {
                        views[`${namespace}::${view.name}`] = view;
                    });
                });
        });

        return views;
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

            if (!file.includes("blade.php")) {
                return [];
            }

            const name = file.replace(".blade.php", "");
            const prefix =
                path === basePath
                    ? ""
                    : path.replace(`${basePath}/`, "").replace("/", ".");

            return {
                name: prefix === "" ? name : `${prefix}.${name}`,
                relativePath: `${path}/${name}`.replace(projectPath(""), ""),
                uri: vscode.Uri.file(`${path}/${file}`),
            };
        })
        .flat();
};

export const getViews = repository<ViewItem>(
    load,
    "{,**/}{view,views}/{*,**/*}",
    {},
    ["create", "delete"],
);
