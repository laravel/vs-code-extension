import * as vscode from "vscode";
import { CompletionItemFunction, CompletionProvider, Tags } from "..";
import { getMixManifest } from "../repositories/mix";
import { wordMatchRegex } from "./../support/patterns";

export default class Mix implements CompletionProvider {
    tags(): Tags {
        return [
            {
                functions: ["mix"],
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
