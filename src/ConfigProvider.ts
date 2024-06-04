"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, Provider, Tags } from ".";
import { getConfigs } from "./repositories/configs";
import { wordMatchRegex } from "./support/patterns";

export default class ConfigProvider implements Provider {
    tags(): Tags {
        return { classes: ["Config"], functions: ["config"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return getConfigs().map((config) => {
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
