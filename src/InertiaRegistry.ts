import { View } from ".";
import Logger from "./Logger";
import { createFileWatcher } from "./fileWatcher";
import Helpers from "./helpers";
import * as fs from "fs";
import * as vscode from "vscode";
import { projectPath } from "./support/project";

class InertiaRegistry {
    views: {
        [key: string]: View;
    } = {};

    constructor() {
        this.load();

        // TODO: Check this path
        createFileWatcher(
            "{,**/}{resources/js/Pages}/{*,**/*}",
            this.load.bind(this),
            ["create", "delete"],
        );
    }

    private load() {
        ["/resources/js/Pages"].forEach((path) => {
            this.getViews(projectPath(path)).forEach((view) => {
                this.views[view.name] = view;
            });
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

                if (!file.match(/\.vue|\.tsx|\.jsx$/)) {
                    return [];
                }

                const name = file.replace(/\.(vue|tsx|jsx)$/, "");

                return {
                    name,
                    relativePath: `${path}/${name}`.replace(
                        projectPath(""),
                        "",
                    ),
                    uri: vscode.Uri.file(`${path}/${file}`),
                };
            })
            .flat();
    }
}

export default new InertiaRegistry();
