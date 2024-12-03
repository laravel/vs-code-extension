"use strict";

import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import ParsingResult from "../parser/ParsingResult";
import { getTranslations } from "../repositories/translations";
import { info } from "../support/logger";
import { wordMatchRegex } from "./../support/patterns";

export default class Translation implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: facade("Lang"),
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
        result: ParsingResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (result.isParamIndex(1)) {
            info("Translation", "Parameter index 1");
            return this.getParameterCompletionItems(result, document, position);
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

    private getParameterCompletionItems(
        result: ParsingResult,
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.CompletionItem[] {
        info("is key", result.fillingInArrayKey());
        if (!result.fillingInArrayKey()) {
            return [];
        }

        // Parameters autocomplete
        return Object.entries(getTranslations().items)
            .filter(([key, value]) => key === result.param(0).value)
            .map(([key, value]) => {
                return value.default.params
                    .filter((param) => {
                        return true;
                        // TODO: Fix this....
                        // return !result.param.keys.includes(param);
                    })
                    .map((param) => {
                        let completionItem = new vscode.CompletionItem(
                            param,
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
}
