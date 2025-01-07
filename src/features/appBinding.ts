import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getAppBindings } from "@src/repositories/appBinding";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import {
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind: FeatureTag = [
    {
        class: [...facade("App"), "app"],
        method: ["make", "bound", "isShared"],
        argumentIndex: 0,
    },
    { method: "app", argumentIndex: 0 },
];

const toUrl = (path: string, line: number) => {
    return vscode.Uri.file(projectPath(path)).with({
        fragment: `L${line}`,
    });
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getAppBindings,
        ({ param }) => {
            const binding = getAppBindings().items[param.value];

            if (!binding) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                toUrl(binding.path, binding.line),
            );
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getAppBindings, (match) => {
        const binding = getAppBindings().items[match];

        if (!binding) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                [
                    "`" + binding.class + "`",
                    `[${binding.path}](${toUrl(binding.path, binding.line)})`,
                ].join("\n\n"),
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
        getAppBindings,
        ({ param }) => {
            const appBinding = getAppBindings().items[param.value];

            if (appBinding) {
                return null;
            }

            return notFound(
                "App binding",
                param.value,
                detectedRange(param),
                "appBinding",
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
        if (!config("appBinding.completion", true)) {
            return [];
        }

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
    },
};
