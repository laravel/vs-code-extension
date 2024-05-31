"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import { resolve } from "path";
import Logger from "./Logger";
import { runInLaravel } from "./PHP";

export default class Helpers {
    static wordMatchRegex = /[\w\d\-_\.\:\\\/@]+/g;
    static phpParser: any = null;
    static cachedParseFunction: any = null;
    static modelsCache: Array<string>;
    static modelsCacheTime: number = 0;
    static lastErrorMessage: number = 0;
    static disableErrorMessage: boolean = false;

    static functionRegex: any = null;

    static classes: Array<string> = [];

    // TODO: Tighten up the typing here
    static registerProvider(provider: any) {
        if (typeof provider.tags !== "undefined") {
            let tags = provider.tags();

            if (tags.classes) {
                this.classes = this.classes.concat(tags.classes);
            }
        }
    }

    /**
     * Create full path from project file name
     *
     * @param path
     * @param forCode
     * @param string
     */
    static projectPath(path: string, forCode: boolean = false): string {
        if (path[0] !== "/") {
            path = "/" + path;
        }

        let basePath = vscode.workspace
            .getConfiguration("Laravel")
            .get<string>("basePath");
        if (forCode === false && basePath && basePath.length > 0) {
            if (
                basePath.startsWith(".") &&
                vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders.length > 0
            ) {
                basePath = resolve(
                    vscode.workspace.workspaceFolders[0].uri.fsPath,
                    basePath,
                );
            }
            basePath = basePath.replace(/[\/\\]$/, "");
            return basePath + path;
        }

        let basePathForCode = vscode.workspace
            .getConfiguration("Laravel")
            .get<string>("basePathForCode");
        if (forCode && basePathForCode && basePathForCode.length > 0) {
            if (
                basePathForCode.startsWith(".") &&
                vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders.length > 0
            ) {
                basePathForCode = resolve(
                    vscode.workspace.workspaceFolders[0].uri.fsPath,
                    basePathForCode,
                );
            }
            basePathForCode = basePathForCode.replace(/[\/\\]$/, "");
            return basePathForCode + path;
        }

        if (
            vscode.workspace.workspaceFolders instanceof Array &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            for (let workspaceFolder of vscode.workspace.workspaceFolders) {
                if (fs.existsSync(workspaceFolder.uri.fsPath + "/artisan")) {
                    return workspaceFolder.uri.fsPath + path;
                }
            }
        }
        return "";
    }

    static arrayUnique(value: any, index: any, self: any[]) {
        return self.indexOf(value) === index;
    }

    static showErrorPopup() {
        let disableErrorAlert = vscode.workspace
            .getConfiguration("Laravel")
            .get<boolean>("disableErrorAlert");
        if (
            disableErrorAlert == false &&
            Helpers.disableErrorMessage == false &&
            Helpers.lastErrorMessage + 10 < Date.now() / 1000
        ) {
            Helpers.lastErrorMessage = Date.now() / 1000;

            vscode.window
                .showErrorMessage(
                    "Laravel VS Code error",
                    "View Error",
                    "Don't show again",
                )
                .then(function (val: string | undefined) {
                    if (val === "Don't show again") {
                        Helpers.disableErrorMessage = true;
                    } else if (val === "View Error") {
                        Logger.channel?.show(true);
                    }
                });
        }
    }

    /**
     * Get laravel models as array.
     *
     * @returns array<string>
     */
    static getModels(): Promise<Array<string>> {
        var self = this;
        return new Promise<Array<string>>(function (resolve, reject) {
            if (Math.floor(Date.now() / 1000) - self.modelsCacheTime < 60) {
                return resolve(self.modelsCache);
            } else {
                runInLaravel(
                    `
					echo json_encode(array_values(array_filter(array_map(function ($name) {return app()->getNamespace().str_replace([app_path().'/', app_path().'\\\\', '.php', '/'], ['', '', '', '\\\\'], $name);}, array_merge(glob(app_path('*')), glob(app_path('Models/*')))), function ($class) {
						return class_exists($class) && is_subclass_of($class, 'Illuminate\\\\Database\\\\Eloquent\\\\Model');
					})));
				`,
                    "Application Models",
                )
                    .then(function (result) {
                        if (!result) {
                            return;
                        }

                        var models = JSON.parse(result);
                        self.modelsCache = models;
                        resolve(models);
                    })
                    .catch(function (error) {
                        console.error(error);
                        resolve([]);
                    });
            }
        });
    }

    /**
     * Get indent space based on user configuration
     */
    static indent(text: string = "", repeat: number = 1): string {
        const editor = vscode.window.activeTextEditor;

        if (editor && editor.options.insertSpaces) {
            return " ".repeat(<number>editor.options.tabSize * repeat) + text;
        }

        return "\t" + text;
    }
}
