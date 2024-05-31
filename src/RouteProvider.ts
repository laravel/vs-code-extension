"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";
import { runInLaravel } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import { CompletionItemFunction, Provider, Tags } from ".";
import Logger from "./Logger";

export default class RouteProvider implements Provider {
    private routes: any[] = [];
    private controllers: any[] = [];

    constructor() {
        this.loadRoutes();
        this.loadControllers();

        createFileWatcher(
            "{,**/}{Controllers,[Rr]oute}{,s}{.php,/*.php,/**/*.php}",
            () => {
                this.loadRoutes();
                this.loadControllers();
            },
        );
    }

    tags(): Tags {
        return { classes: ["Route"], functions: ["route", "signedRoute"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (
            func.class === "Route" &&
            [
                "get",
                "post",
                "put",
                "patch",
                "delete",
                "options",
                "any",
                "match",
            ].some((fc: string) => func.function === fc)
        ) {
            if (
                (func.function === "match" && func.paramIndex === 2) ||
                (func.function !== "match" && func.paramIndex === 1)
            ) {
                // Route action autocomplete.
                return this.controllers
                    .filter(
                        (controller) =>
                            typeof controller === "string" &&
                            controller.length > 0,
                    )
                    .map((controller: string) => {
                        let compeleteItem = new vscode.CompletionItem(
                            controller,
                            vscode.CompletionItemKind.Enum,
                        );

                        compeleteItem.range = document.getWordRangeAtPosition(
                            position,
                            Helpers.wordMatchRegex,
                        );

                        return compeleteItem;
                    });
            }

            return [];
        }

        if (func.function?.includes("middleware") !== false) {
            return [];
        }

        if (func.paramIndex === 1) {
            // route parameters autocomplete
            return this.routes
                .filter((route) => route.name === func.parameters[0])
                .map((route) => {
                    return route.parameters.map((parameter: string) => {
                        let compeleteItem = new vscode.CompletionItem(
                            parameter,
                            vscode.CompletionItemKind.Variable,
                        );

                        compeleteItem.range = document.getWordRangeAtPosition(
                            position,
                            Helpers.wordMatchRegex,
                        );

                        return compeleteItem;
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
                    Helpers.wordMatchRegex,
                );

                completionItem.detail = [
                    route.action,
                    `${route.method}:${route.uri}`,
                ].join("\n\n");

                return completionItem;
            });
    }

    loadRoutes() {
        if (
            vscode.workspace.workspaceFolders instanceof Array &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            try {
                var self = this;
                runInLaravel(
                    "echo json_encode(array_map(function ($route) {" +
                        "    return ['method' => implode('|', array_filter($route->methods(), function ($method) {" +
                        "        return $method != 'HEAD';" +
                        "    })), 'uri' => $route->uri(), 'name' => $route->getName(), 'action' => str_replace('App\\\\Http\\\\Controllers\\\\', '', $route->getActionName()), 'parameters' => $route->parameterNames()];" +
                        "}, app('router')->getRoutes()->getRoutes()));",
                    "HTTP Routes",
                ).then(function (result) {
                    if (!result) {
                        return;
                    }

                    var routes = JSON.parse(result);
                    routes = routes.filter((route: any) => route !== "null");
                    self.routes = routes;
                });
            } catch (exception) {
                console.error(exception);
            }
        }
    }

    loadControllers() {
        try {
            this.controllers = this.getControllers(
                Helpers.projectPath("app/Http/Controllers"),
            ).map((contoller) => contoller.replace(/@__invoke/, ""));
            this.controllers = this.controllers.filter(
                (v, i, a) => a.indexOf(v) === i,
            );
        } catch (exception) {
            console.error(exception);
        }
    }

    getControllers(path: string): Array<string> {
        var self = this;
        var controllers: Array<string> = [];
        if (path.substr(-1) !== "/" && path.substr(-1) !== "\\") {
            path += "/";
        }
        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
            fs.readdirSync(path).forEach(function (file) {
                if (fs.lstatSync(path + file).isDirectory()) {
                    controllers = controllers.concat(
                        self.getControllers(path + file + "/"),
                    );
                } else {
                    if (file.includes(".php")) {
                        var controllerContent = fs.readFileSync(
                            path + file,
                            "utf8",
                        );
                        if (controllerContent.length < 50000) {
                            var match =
                                /class\s+([A-Za-z0-9_]+)\s+extends\s+.+/g.exec(
                                    controllerContent,
                                );
                            var matchNamespace =
                                /namespace .+\\Http\\Controllers\\?([A-Za-z0-9_]*)/g.exec(
                                    controllerContent,
                                );
                            var functionRegex =
                                /public\s+function\s+([A-Za-z0-9_]+)\(.*\)/g;
                            if (match !== null && matchNamespace) {
                                var className = match[1];
                                var namespace = matchNamespace[1];
                                while (
                                    (match =
                                        functionRegex.exec(
                                            controllerContent,
                                        )) !== null &&
                                    match[1] !== "__construct"
                                ) {
                                    if (namespace.length > 0) {
                                        controllers.push(
                                            namespace +
                                                "\\" +
                                                className +
                                                "@" +
                                                match[1],
                                        );
                                    }
                                    controllers.push(
                                        className + "@" + match[1],
                                    );
                                }
                            }
                        }
                    }
                }
            });
        }
        return controllers;
    }
}
