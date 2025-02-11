import { runInLaravel, template } from "@src/support/php";
import { projectPath, relativePath } from "@src/support/project";
import * as fs from "fs";
import * as sysPath from "path";
import { repository } from ".";
import { View } from "..";

interface ViewItem {
    [key: string]: View;
}

export let inertiaPagePaths: string[] | null = null;
export let inertiaPageExtensions: string[] | null = null;

const load = (pagePaths: string[], validExtensions: string[], registeredHints: Record<string, string>) => {
    inertiaPagePaths = pagePaths;
    inertiaPageExtensions = validExtensions;

    let views: ViewItem = {};

    pagePaths = pagePaths.length > 0 ? pagePaths : ["resources/js/Pages"];

    pagePaths
        .map((path) => sysPath.sep + relativePath(path))
        .forEach((path) => {
            collectViews(projectPath(path), path, validExtensions, registeredHints).forEach(
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
    registeredHints: Record<string, string>
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
                    registeredHints
                );
            }



            const parts = file.split(".");
            const extension = parts.pop();
            const hint = typeof registeredHints[path] === 'undefined' ? false : registeredHints[path];

            if (!validExtensions.includes(extension ?? "")) {
                return [];
            }

            const name = parts.join(".");

            return {
                name: relativePath(sysPath.join(path, name))
                    .replace(basePath.substring(1) + sysPath.sep, "")
                    .replaceAll(sysPath.sep, "/"),
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
            page_hints?: Record<string, string>
        }>(template("inertia")).then((result) => {
            console.log(result);

            return load(
                result?.page_paths ?? [],
                result?.page_extensions ?? [],
                result?.page_hints ?? {}
            );
        }),
    () =>
        new Promise((resolve) => {
            const checkForPagePaths = () => {
                if (inertiaPagePaths === null) {
                    return setTimeout(checkForPagePaths, 100);
                }

                if (inertiaPagePaths.length === 0) {
                    resolve(null);
                } else {
                    resolve(`{${inertiaPagePaths.join(",")}}/{*,**/*}`);
                }
            };

            checkForPagePaths();
        }),
    {},
    ["create", "delete"],
);
