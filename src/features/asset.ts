import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getAssets } from "@src/repositories/asset";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import * as vscode from "vscode";
import { FeatureTag, LinkProvider } from "..";

const toFind: FeatureTag = { class: null, method: "asset", argumentIndex: 0 };

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getAssets,
        ({ param }) => {
            const asset = getAssets().items.find(
                (asset) => asset.path === param.value,
            )?.uri;

            if (!asset) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(asset.path),
            );
        },
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getAssets,
        ({ param }) => {
            const asset = getAssets().items.find(
                (item) => item.path === param.value,
            );

            if (asset) {
                return null;
            }

            return notFound(
                "Asset",
                param.value,
                detectedRange(param),
                "asset",
            );
        },
    );
};

export const completionProvider = {
    tags() {
        return toFind;
    },

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return getAssets().items.map((file) => {
            let completeItem = new vscode.CompletionItem(
                file.path,
                vscode.CompletionItemKind.Constant,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completeItem;
        });
    },
};
