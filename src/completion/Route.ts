"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, CompletionProvider, Tags } from "..";
import { getControllers } from "../repositories/controllers";
import { getMiddleware } from "../repositories/middleware";
import { getRoutes } from "../repositories/routes";
import { wordMatchRegex } from "./../support/patterns";

// TODO: This class is 3 classes: Route, Controller, Middleware
// Not sure why they are all in one class
export default class Route implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: "Illuminate\\Support\\Facades\\Route",
                functions: [
                    "get",
                    "post",
                    "put",
                    "patch",
                    "delete",
                    "options",
                    "any",
                    "match",
                ],
            },
            {
                functions: ["route", "signedRoute"],
            },
        ];
    }

    autoCompleteAction(func: CompletionItemFunction): boolean {
        if (func.fqn !== "Illuminate\\Support\\Facades\\Route") {
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
            return getControllers()
                .items.filter(
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
            return Object.entries(getMiddleware().items).map(([key, value]) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Enum,
                );

                completionItem.detail = value ?? "";

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
        }

        if (func.param.index === 1) {
            // Route parameters autocomplete
            return getRoutes()
                .items.filter((route) => route.name === func.parameters[0])
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
        return getRoutes()
            .items.filter(
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
}
