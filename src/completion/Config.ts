"use strict";

import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import ParsingResult from "../parser/ParsingResult";
import { getConfigs } from "../repositories/configs";
import { wordMatchRegex } from "../support/patterns";

export default class Config implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: "Illuminate\\Support\\Facades\\Config",
                functions: ["get"],
            },
            {
                functions: ["config"],
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
        return getConfigs().items.map((config) => {
            let completeItem = new vscode.CompletionItem(
                config.name,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            if (config.value) {
                completeItem.detail = config.value.toString();
            }

            return completeItem;
        });
    }
}
