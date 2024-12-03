"use strict";

import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import ParsingResult from "../parser/ParsingResult";
import { getAppBindings } from "../repositories/appBinding";
import { wordMatchRegex } from "./../support/patterns";

export default class App implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: facade("App"),
                functions: ["make", "bound", "isShared"],
            },
            {
                functions: ["app"],
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
        return Object.entries(getAppBindings().items).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Constant,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completeItem;
        });
    }
}
