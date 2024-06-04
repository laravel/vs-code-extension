"use strict";

import * as fs from "fs";
import * as vscode from "vscode";
import { CompletionItemFunction, CompletionProvider, Tags } from "..";
import { createFileWatcher } from "./../support/fileWatcher";
import { wordMatchRegex } from "./../support/patterns";
import { runInLaravel, template } from "./../support/php";
import { projectPath } from "./../support/project";

export default class Route implements CompletionProvider {
    // TODO: Tighten up the typing here
    private routes: any[] = [];
    private controllers: any[] = [];
    private middlewares: any[] = [];

    constructor() {
        this.load();

        createFileWatcher(
            "{,**/}{Controllers,[Rr]oute}{,s}{.php,/*.php,/**/*.php}",
            this.load.bind(this),
        );

        createFileWatcher("app/Http/Kernel.php", this.load.bind(this), [
            "change",
        ]);
    }

    tags(): Tags {
        return { classes: ["Route"], functions: ["route", "signedRoute"] };
    }

    autoCompleteAction(func: CompletionItemFunction): boolean {
        if (func.class !== "Route") {
            return false;
        }

        if (func.function === null) {
            return false;
        }

        return [
            "get",
            "post",
            "put",
            "patch",
            "delete",
            "options",
            "any",
            "match",
        ].includes(func.function);
    }

    autoCompleteActionParam(func: CompletionItemFunction): boolean {
        if (func.function === "match") {
            return func.param.index === 2;
        }

        return func.param.index === 1;
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        // TODO: maybe something like this?
        // this.autoCompleteAction(func) || this.autoCompleteMiddleware() || this.autoCompleteRoute()

        if (this.autoCompleteAction(func)) {
            if (!this.autoCompleteActionParam(func)) {
                return [];
            }

            // Route action autocomplete
            return this.controllers
                .filter(
                    (controller) =>
                        typeof controller === "string" && controller.length > 0,
                )
                .map((controller: string) => {
                    let completionItem = new vscode.CompletionItem(
                        controller,
                        vscode.CompletionItemKind.Enum,
                    );

                    completionItem.range = document.getWordRangeAtPosition(
                        position,
                        wordMatchRegex,
                    );

                    return completionItem;
                });
        }

        if (func.function === "middleware") {
            return Object.entries(this.middlewares).map(([key, value]) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Enum,
                );

                completionItem.detail = value;

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
        }

        if (func.param.index === 1) {
            // Route parameters autocomplete
            return this.routes
                .filter((route) => route.name === func.parameters[0])
                .map((route) => {
                    return route.parameters.map((parameter: string) => {
                        let completionItem = new vscode.CompletionItem(
                            parameter,
                            vscode.CompletionItemKind.Variable,
                        );

                        completionItem.range = document.getWordRangeAtPosition(
                            position,
                            wordMatchRegex,
                        );

                        return completionItem;
                    });
                })
                .flat();
        }

        // Route name autocomplete
        return this.routes
            .filter(
                (route) =>
                    typeof route.name === "string" && route.name.length > 0,
            )
            .map((route) => {
                let completionItem = new vscode.CompletionItem(
                    route.name,
                    vscode.CompletionItemKind.Enum,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                completionItem.detail = [
                    route.action,
                    `${route.method}:${route.uri}`,
                ].join("\n\n");

                return completionItem;
            });
    }

    load() {
        this.loadRoutes();
        this.loadControllers();
        this.loadMiddleware();
    }

    loadMiddleware() {
        runInLaravel<any[]>(template("middleware"), "Middlewares")
            .then((result) => {
                this.middlewares = result;
            })
            .catch((exception) => {
                console.error(exception);
            });
    }

    loadRoutes() {
        runInLaravel<any[]>(template("routes"), "HTTP Routes")
            .then((result) => {
                this.routes = result.filter(
                    // TODO: "null"?
                    (route: any) => route !== "null",
                );
            })
            .catch((exception) => {
                console.error(exception);
            });
    }

    loadControllers() {
        try {
            this.controllers = this.getControllers(
                projectPath("app/Http/Controllers"),
            ).map((contoller) => contoller.replace(/@__invoke/, ""));
        } catch (exception) {
            console.error(exception);
        }
    }

    getControllers(path: string): string[] {
        let controllers = new Set<string>();

        if (path.substring(-1) !== "/" && path.substring(-1) !== "\\") {
            path += "/";
        }

        if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
            return [...controllers];
        }

        fs.readdirSync(path).forEach((file) => {
            const fullPath = path + file;

            if (fs.lstatSync(fullPath).isDirectory()) {
                this.getControllers(fullPath + "/").forEach((controller) => {
                    controllers.add(controller);
                });

                return;
            }

            if (!file.includes(".php")) {
                return;
            }

            const controllerContent = fs.readFileSync(fullPath, "utf8");

            if (controllerContent.length > 50_000) {
                // TODO: Hm, yeah?
                return;
            }

            let match = /class\s+([A-Za-z0-9_]+)\s+extends\s+.+/g.exec(
                controllerContent,
            );

            const matchNamespace =
                /namespace .+\\Http\\Controllers\\?([A-Za-z0-9_]*)/g.exec(
                    controllerContent,
                );

            if (match === null || !matchNamespace) {
                return;
            }

            const functionRegex = /public\s+function\s+([A-Za-z0-9_]+)\(.*\)/g;

            let className = match[1];
            let namespace = matchNamespace[1];

            while (
                (match = functionRegex.exec(controllerContent)) !== null &&
                match[1] !== "__construct"
            ) {
                if (namespace.length > 0) {
                    controllers.add(`${namespace}\\${className}@${match[1]}`);
                }

                controllers.add(`${className}@${match[1]}`);
            }
        });

        return [...controllers];
    }
}
