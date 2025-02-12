import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { AuthItem, getPolicies } from "@src/repositories/auth";
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
        ({ param, item, index }) => {
            const policy = getPolicies().items[param.value];

            if (!policy || policy.length === 0) {
                return null;
            }

            if (item.type !== "methodCall" || !item.methodName || index !== 0) {
                return null;
            }

            if (["has"].includes(item.methodName)) {
                return formattedLink(policy, param);
            }

            if (item.arguments.children.length < 2) {
                // We don't have a second argument, just ignore it for now
                return null;
            }

            // @ts-ignore
            const nextArg = item.arguments.children[1].children[0];
            const classArg = nextArg?.className;

            if (!classArg) {
                // If it's not a class we can even identify, just ignore it
                return null;
            }

            const found = policy.find((item) => item.model === classArg);

            if (!found) {
                return null;
            }

            return formattedLink([found], param);
        },
    );
};

const formattedLink = (items: AuthItem[], param: any) => {
    return items.map((item) => {
        return new vscode.DocumentLink(
            detectedRange(param),
            vscode.Uri.file(item.uri).with({
                fragment: `L${item.line}`,
            }),
        );
    });
};

const formattedHover = (items: AuthItem[]) => {
    const text = items.map((item) => {
        if (item.policy) {
            return [
                "`" + item.policy + "`",
                relativeMarkdownLink(
                    vscode.Uri.file(item.uri).with({
                        fragment: `L${item.line}`,
                    }),
                ),
            ].join("\n\n");
        }

        return relativeMarkdownLink(
            vscode.Uri.file(item.uri).with({
                fragment: `L${item.line}`,
            }),
        );
    });

    return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(
        doc,
        pos,
        toFind,
        getPolicies,
        (match, { index, item }) => {
            const items = getPolicies().items[match];

            if (!items || items.length === 0) {
                return null;
            }

            if (item.type !== "methodCall" || !item.methodName || index !== 0) {
                return null;
            }

            if (["has"].includes(item.methodName)) {
                return formattedHover(items);
            }

            if (item.arguments.children.length < 2) {
                // We don't have a second argument, just ignore it for now
                return null;
            }

            // @ts-ignore
            const nextArg = item.arguments.children[1].children[0];
            const classArg = nextArg?.className;

            if (!classArg) {
                // If it's not a class we can even identify, just ignore it
                return null;
            }

            const found = items.find((item) => item.model === classArg);

            if (!found) {
                return null;
            }

            return formattedHover([found]);
        },
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getPolicies,
        ({ param, item, index }) => {
            if (item.type !== "methodCall" || !item.methodName || index !== 0) {
                return null;
            }

            const policy = getPolicies().items[param.value];

            if (!policy) {
                return notFound(
                    "Policy",
                    param.value,
                    detectedRange(param),
                    "auth",
                );
            }

            if (["has"].includes(item.methodName)) {
                return null;
            }

            if (item.arguments.children.length < 2) {
                // We don't have a second argument, just ignore it for now
                return null;
            }

            // @ts-ignore
            const nextArg = item.arguments.children[1].children[0];
            const classArg = nextArg?.className;

            if (!classArg) {
                // If it's not a class we can even identify, just ignore it
                return null;
            }

            const found = policy.find((item) => item.model === classArg);

            if (!found) {
                return notFound(
                    "Policy/Model match",
                    classArg,
                    detectedRange(param),
                    "auth",
                );
            }

            return null;
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
                key,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            const policyClasses = value
                .map((item) => item.policy)
                .filter(String);

            if (policyClasses.length > 0) {
                completeItem.detail = policyClasses.join("\n\n");
            }

            return completeItem;
        });
    },
};
