import { runInLaravel, template } from "@src/support/php";
import * as fs from "fs";
import * as vscode from "vscode";
import { repository } from ".";
import { View } from "..";
import { projectPath, relativePath } from "./../support/project";

interface ViewItem {
    [key: string]: View;
}

const load = (pagePaths: string[], validExtensions: string[]) => {
    let views: ViewItem = {};

    pagePaths = pagePaths.length > 0 ? pagePaths : ["/resources/js/Pages"];

    pagePaths
        .map((path) => "/" + relativePath(path))
        .forEach((path) => {
            collectViews(projectPath(path), path, validExtensions).forEach(
                (view) => {
                    views[view.name] = view;
                },
            );
        });

    return views;
};

const collectViews = (
    path: string,
    basePath: string,
    validExtensions: string[],
): View[] => {
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
                return collectViews(
                    `${path}/${file}`,
                    basePath,
                    validExtensions,
                );
            }

            const parts = file.split(".");
            const extension = parts.pop();

            if (!validExtensions.includes(extension ?? "")) {
                return [];
            }

            const name = parts.join(".");

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
    () =>
        runInLaravel<{
            page_paths?: string[];
            page_extensions?: string[];
        }>(template("inertia")).then((result) => {
            return load(result.page_paths ?? [], result.page_extensions ?? []);
        }),
    "{,**/}{resources/js/Pages}/{*,**/*}",
    {},
    ["create", "delete"],
);
