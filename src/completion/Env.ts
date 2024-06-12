"use strict";

import * as vscode from "vscode";
import { CompletionProvider, ParsingResult, Tags } from "..";
import { getEnv } from "../repositories/env";
import { wordMatchRegex } from "./../support/patterns";

export default class Env implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: "Illuminate\\Support\\Env",
                functions: ["get"],
            },
            {
                functions: ["env"],
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
        return Object.entries(getEnv().items).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Constant,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            completeItem.detail = value.value;

            return completeItem;
        });
    }
}
