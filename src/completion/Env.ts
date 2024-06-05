"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, CompletionProvider, Tags } from "..";
import { getEnv } from "../repositories/env";
import { wordMatchRegex } from "./../support/patterns";

export default class Env implements CompletionProvider {
    tags(): Tags {
        return { classes: [], functions: ["env"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return Object.entries(getEnv()).map(([key, value]) => {
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
