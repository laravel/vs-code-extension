"use strict";

import * as vscode from "vscode";
import Logger from "./Logger";
import { runInLaravel } from "./PHP";
import { config } from "./support/config";

export default class Helpers {
    static wordMatchRegex = /[\w\d\-_\.\:\\\/@]+/g;
    static phpParser: any = null;
    static cachedParseFunction: any = null;
    static modelsCache: string[];
    static modelsCacheTime: number = 0;
    static lastErrorMessage: number = 0;
    static disableErrorMessage: boolean = false;

    static functionRegex: any = null;

    static classes: string[] = [];

    // TODO: Tighten up the typing here
    static registerProvider(provider: any) {
        if (typeof provider.tags !== "undefined") {
            let tags = provider.tags();

            if (tags.classes) {
                this.classes = this.classes.concat(tags.classes);
            }
        }
    }

    static arrayUnique(value: any, index: any, self: any[]) {
        return self.indexOf(value) === index;
    }

    static showErrorPopup() {
        let disableErrorAlert = config<boolean>("disableErrorAlert", false);

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
     * @returns string[]
     */
    static getModels(): Promise<string[]> {
        var self = this;
        return new Promise<string[]>(function (resolve, reject) {
            if (Math.floor(Date.now() / 1000) - self.modelsCacheTime < 60) {
                return resolve(self.modelsCache);
            } else {
                runInLaravel<string[]>(
                    `
					echo json_encode(array_values(array_filter(array_map(function ($name) {return app()->getNamespace().str_replace([app_path().'/', app_path().'\\\\', '.php', '/'], ['', '', '', '\\\\'], $name);}, array_merge(glob(app_path('*')), glob(app_path('Models/*')))), function ($class) {
						return class_exists($class) && is_subclass_of($class, 'Illuminate\\\\Database\\\\Eloquent\\\\Model');
					})));
				`,
                    "Application Models",
                )
                    .then(function (result) {
                        self.modelsCache = result;
                        resolve(result);
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
