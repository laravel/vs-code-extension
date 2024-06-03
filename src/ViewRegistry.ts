import { View } from ".";
import { runInLaravel } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import Helpers from "./helpers";
import * as fs from "fs";
import * as vscode from "vscode";

class ViewRegistry {
    views: {
        [key: string]: View;
    } = {};

    constructor() {
        this.load();

        createFileWatcher("{,**/}{view,views}/{*,**/*}", this.load.bind(this), [
            "create",
            "delete",
        ]);
    }

    private load() {
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
                    path.replace(
                        Helpers.projectPath("/", true),
                        Helpers.projectPath("/"),
                    ),
                )
                .forEach((path: string) => {
                    this.getViews(path).forEach((view) => {
                        this.views[view.name] = view;
                    });
                });

            Object.entries(results.hints).forEach(
                ([namespace, viewNamespaces]) => {
                    viewNamespaces
                        .map((path) =>
                            path.replace(
                                Helpers.projectPath("/", true),
                                Helpers.projectPath("/"),
                            ),
                        )
                        .forEach((path) => {
                            this.getViews(path).forEach((view) => {
                                this.views[`${namespace}::${view.name}`] = view;
                            });
                        });
                },
            );
        });
    }

    private getViews(path: string): View[] {
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
                    return this.getViews(`${path}/${file}`);
                }

                if (file.includes("blade.php")) {
                    const name = file.replace(".blade.php", "");

                    return {
                        name,
                        relativePath: `${path}/${name}`.replace(
                            Helpers.projectPath(""),
                            "",
                        ),
                        uri: vscode.Uri.file(`${path}/${file}`),
                    };
                }

                return [];
            })
            .flat();
    }
}

export default new ViewRegistry();
