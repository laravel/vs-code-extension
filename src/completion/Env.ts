"use strict";

import { support } from "@src/support/util";
import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import AutocompleteResult from "../parser/AutocompleteResult";
import { getEnv } from "../repositories/env";
import { wordMatchRegex } from "./../support/patterns";

export default class Env implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: support("Env"),
                functions: ["get"],
                paramIndex: 0,
            },
            {
                functions: ["env"],
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
