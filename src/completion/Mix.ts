import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import AutocompleteResult from "../parser/ParsingResult";
import { getMixManifest } from "../repositories/mix";
import { wordMatchRegex } from "./../support/patterns";

export default class Mix implements CompletionProvider {
    tags(): Tags {
        return [
            {
                functions: ["mix"],
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
        return getMixManifest().items.map((mix) => {
            let completeItem = new vscode.CompletionItem(
                mix.key,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completeItem;
        });
    }
}
