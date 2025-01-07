import { runInLaravel, template } from "@src/support/php";
import { projectPath, relativePath } from "@src/support/project";
import * as fs from "fs";
import * as sysPath from "path";
import { repository } from ".";
import { View } from "..";

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
    if (path.substring(-1) === sysPath.sep) {
        path = path.substring(0, path.length - 1);
    }

    if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
        return [];
    }

    return fs
        .readdirSync(path)
        .map((file: string) => {
            if (fs.lstatSync(sysPath.join(path, file)).isDirectory()) {
                return collectViews(
                    sysPath.join(path, file),
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
                name: relativePath(sysPath.join(path, name)).replace(
                    basePath.substring(1) + sysPath.sep,
                    "",
                ),
                path: relativePath(sysPath.join(path, file)),
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
            return load(
                result?.page_paths ?? [],
                result?.page_extensions ?? [],
            );
        }),
    "{,**/}{resources/js/Pages}/{*,**/*}",
    {},
    ["create", "delete"],
);
