"use strict";

import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import AutocompleteResult from "../parser/AutocompleteResult";
import { getConfigs } from "../repositories/configs";
import { wordMatchRegex } from "../support/patterns";

export default class Config implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: facade("Config"),
                functions: ["get"],
                paramIndex: 0,
            },
            {
                functions: ["config"],
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
