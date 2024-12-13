import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getPolicies } from "@src/repositories/auth";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { facade, relativeMarkdownLink } from "@src/support/util";
import * as vscode from "vscode";
import {
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind: FeatureTag = [
    {
        class: facade("Gate"),
        method: [
            "has",
            "allows",
            "denies",
            "check",
            "any",
            "none",
            "authorize",
            "inspect",
        ],
        argumentIndex: 0,
    },
    {
        class: [...facade("Route"), ...facade("Auth")],
        method: ["can", "cannot"],
        argumentIndex: 0,
    },
    {
        method: ["@can", "@cannot", "@canany"],
        argumentIndex: 0,
    },
];

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getPolicies,
        ({ param }) => {
            const policy = getPolicies().items[param.value];

            if (!policy || policy.length === 0) {
                return null;
            }

            return policy.map((item) => {
                return new vscode.DocumentLink(
                    detectedRange(param),
                    vscode.Uri.file(item.uri).with({
                        fragment: `L${item.lineNumber}`,
                    }),
                );
            });
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getPolicies, (match) => {
        const items = getPolicies().items[match];

        if (!items || items.length === 0) {
            return null;
        }

        const text = items.map((item) => {
            if (item.policy_class) {
                return [
                    "`" + item.policy_class + "`",
                    relativeMarkdownLink(
                        vscode.Uri.file(item.uri).with({
                            fragment: `L${item.lineNumber}`,
                        }),
                    ),
                ].join("\n\n");
            }

            return relativeMarkdownLink(
                vscode.Uri.file(item.uri).with({
                    fragment: `L${item.lineNumber}`,
                }),
            );
        });

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getPolicies,
        ({ param }) => {
            if (getPolicies().items[param.value]) {
                return null;
            }

            return notFound(
                "Policy",
                param.value,
                detectedRange(param),
                "auth",
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
        if (!config("auth.completion", true)) {
            return [];
        }

        if (result.paramCount() > 0) {
            return [];
        }

        return Object.entries(getPolicies().items).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                value[0].key,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            const policyClasses = value
                .map((item) => item.policy_class)
                .filter(String);

            if (policyClasses.length > 0) {
                completeItem.detail = policyClasses.join("\n\n");
            }

            return completeItem;
        });
    },
};
