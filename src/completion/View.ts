"use strict";

import { facade } from "@src/support/util";
import * as fs from "fs";
import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import AutocompleteResult from "../parser/AutocompleteResult";
import { getViews } from "./../repositories/views";
import { wordMatchRegex } from "./../support/patterns";

export default class View implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: facade("View"),
                functions: [
                    "make",
                    "first",
                    "renderWhen",
                    "renderUnless",
                    "renderEach",
                    "exists",
                ],
                paramIndex: 0,
            },
            {
                class: facade("Route"),
                functions: ["view"],
                paramIndex: 1,
            },
            {
                class: "Illuminate\\Mail\\Mailables\\Content",
                argName: ["view", "markdown"],
            },
            {
                functions: [
                    "view",
                    "markdown",
                    "links",
                    "@extends",
                    "@component",
                    "@include",
                    "@each",
                    "@section",
                    "@push",
                ],
                paramIndex: 0,
            },
        ];
    }

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        const views = getViews().items;

        if (result.func() && ["@section", "@push"].includes(result.func()!)) {
            return this.getYields(result.func()!, document.getText());
        }

        if (result.class() === facade("Route")) {
            if (result.func() === "view" && result.isParamIndex(1)) {
                return views.map(({ key }) => {
                    let completionItem = new vscode.CompletionItem(
                        key,
                        vscode.CompletionItemKind.Constant,
                    );

                    completionItem.range = document.getWordRangeAtPosition(
                        position,
                        wordMatchRegex,
                    );

                    return completionItem;
                });
            }

            return [];
        }

        if (["renderWhen", "renderUnless"].find((f) => f === result.func())) {
            if (!result.isParamIndex(1)) {
                return [];
            }

            return views.map(({ key }) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Constant,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
        }

        if (result.isParamIndex(0)) {
            return views.map(({ key }) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Constant,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
        }

        // TODO: Layer this back in (props)
        return [];

        // if (
        //     // @ts-ignore
        //     typeof views[result.param(0).value] === "undefined" ||
        //     !result.fillingInArrayKey()
        // ) {
        //     return [];
        // }

        // let viewContent = fs.readFileSync(
        //     // @ts-ignore
        //     views[result.param(0).value].uri.path,
        //     "utf8",
        // );

        // let variableRegex = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
        // let r: RegExpExecArray | null = null;
        // let variableNames = new Set<string>([]);

        // while ((r = variableRegex.exec(viewContent))) {
        //     variableNames.add(r[1]);
        // }

        // return [...variableNames].map((variableName) => {
        //     let variablecompletionItem = new vscode.CompletionItem(
        //         variableName,
        //         vscode.CompletionItemKind.Constant,
        //     );
        //     variablecompletionItem.range = document.getWordRangeAtPosition(
        //         position,
        //         wordMatchRegex,
        //     );
        //     return variablecompletionItem;
        // });
    }

    getYields(func: string, documentText: string): vscode.CompletionItem[] {
        let extendsRegex = /@extends\s*\([\'\"](.+)[\'\"]\)/g;
        let regexResult = extendsRegex.exec(documentText);
        const views = getViews().items;

        if (!regexResult) {
            return [];
        }

        const item = views.find((v) => v.key === regexResult![1]);

        if (typeof item === "undefined") {
            return [];
        }

        let parentContent = fs.readFileSync(item.uri.path, "utf8");
        let yieldRegex =
            func === "@push"
                ? /@stack\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g
                : /@yield\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g;

        let yieldNames = new Set<string>([]);

        while ((regexResult = yieldRegex.exec(parentContent))) {
            yieldNames.add(regexResult[1]);
        }

        return [...yieldNames]
            .map(
                (yieldName) =>
                    new vscode.CompletionItem(
                        yieldName,
                        vscode.CompletionItemKind.Constant,
                    ),
            )
            .concat(this.getYields(func, parentContent));
    }
}
