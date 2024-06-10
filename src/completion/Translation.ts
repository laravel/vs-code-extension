"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, CompletionProvider, Tags } from "..";
import { getTranslations } from "../repositories/translations";
import { wordMatchRegex } from "./../support/patterns";

export default class Translation implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: "Illuminate\\Support\\Facades\\Lang",
                functions: [
                    "has",
                    "hasForLocale",
                    "get",
                    "getForLocale",
                    "choice",
                ],
            },
            {
                functions: ["__", "trans", "@lang"],
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
        if (func.param.index === 1) {
            if (!func.param.isKey) {
                return [];
            }

            // Parameters autocomplete
            return Object.entries(getTranslations().items)
                .filter(([key, value]) => key === func.parameters[0])
                .map(([key, value]) => {
                    return value.default.params
                        .filter((param) => {
                            return !func.param.keys.includes(param);
                        })
                        .map((param) => {
                            let completionItem = new vscode.CompletionItem(
                                param,
                                vscode.CompletionItemKind.Variable,
                            );

                            completionItem.range =
                                document.getWordRangeAtPosition(
                                    position,
                                    wordMatchRegex,
                                );

                            return completionItem;
                        });
                })
                .flat();
        }

        return Object.entries(getTranslations().items).map(
            ([key, translations]) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Value,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                completionItem.detail = translations.default.value;

                return completionItem;
            },
        );
    }
}
