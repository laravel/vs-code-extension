import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getMixManifest } from "@src/repositories/mix";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";
import {
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind: FeatureTag = [
    {
        method: ["mix"],
        argumentIndex: 0,
    },
];

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getMixManifest,
        ({ param }) => {
            const mixItem = getMixManifest().items.find(
                (i) => i.key === param.value,
            );

            if (!mixItem) {
                return null;
            }

            return new vscode.DocumentLink(detectedRange(param), mixItem.uri);
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    const items = getMixManifest().items;
    return findHoverMatchesInDoc(doc, pos, toFind, getMixManifest, (match) => {
        const item = items.find((item) => item.key === match);

        if (!item) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                `[${relativePath(item.uri.path)}](${item.uri})`,
            ),
        );
    });
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getMixManifest,
        ({ param }) => {
            const item = getMixManifest().items.find(
                (item) => item.key === param.value,
            );

            if (item) {
                return null;
            }

            return notFound(
                "Mix manifest item",
                param.value,
                detectedRange(param),
                "mix",
            );
        },
    );
};

export const completionProvider: CompletionProvider = {
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
    },
};
