"use strict";

import * as fs from "fs";
import * as vscode from "vscode";
import { CompletionItemFunction, CompletionProvider, Tags } from "..";
import { getViews } from "./../repositories/views";
import { wordMatchRegex } from "./../support/patterns";

export default class View implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: "View",
                functions: [
                    "make",
                    "first",
                    "renderWhen",
                    "renderUnless",
                    "renderEach",
                    "exists",
                ],
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
            },
        ];
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        const views = getViews().items;

        if (func.function && ["@section", "@push"].includes(func.function)) {
            return this.getYields(func.function, document.getText());
        }

        if (func.param.index === 0) {
            return Object.entries(views).map(([key]) => {
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

        if (
            typeof views[func.parameters[0]] === "undefined" ||
            !func.param.isKey
        ) {
            return [];
        }

        let viewContent = fs.readFileSync(
            views[func.parameters[0]].uri.path,
            "utf8",
        );

        let variableRegex = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
        let r: RegExpExecArray | null = null;
        let variableNames = new Set<string>([]);

        while ((r = variableRegex.exec(viewContent))) {
            variableNames.add(r[1]);
        }

        return [...variableNames].map((variableName) => {
            let variablecompletionItem = new vscode.CompletionItem(
                variableName,
                vscode.CompletionItemKind.Constant,
            );
            variablecompletionItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );
            return variablecompletionItem;
        });
    }

    getYields(func: string, documentText: string): vscode.CompletionItem[] {
        let extendsRegex = /@extends\s*\([\'\"](.+)[\'\"]\)/g;
        let regexResult = extendsRegex.exec(documentText);
        const views = getViews().items;

        if (!regexResult) {
            return [];
        }

        if (typeof views[regexResult[1]] === "undefined") {
            return [];
        }

        let parentContent = fs.readFileSync(
            views[regexResult[1]].uri.path,
            "utf8",
        );
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
