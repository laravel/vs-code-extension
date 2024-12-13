import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getRoutes } from "@src/repositories/routes";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import { facade } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import * as vscode from "vscode";
import { FeatureTag, HoverProvider, LinkProvider } from "..";

const toFind: FeatureTag = [
    { method: ["route", "signedRoute", "to_route"] },
    {
        class: [facade("Redirect"), facade("URL"), "redirect", "url"],
        method: ["route", "signedRoute", "temporarySignedRoute"],
    },
];

const isCorrectIndexForMethod = (
    item: AutocompleteParsingResult.ContextValue,
    index: number,
) => {
    // @ts-ignore
    if (item.className === facade("Redirect")) {
        return index === 0;
    }

    return true;
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const route = getRoutes().items.find(
                (route) => route.name === param.value,
            );

            if (!route || !route.filename || !route.line) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(route.filename).with({
                    fragment: `L${route.line}`,
                }),
            );
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getRoutes, (match) => {
        const routeItem = getRoutes().items.find((r) => r.name === match);

        if (!routeItem || !routeItem.filename || !routeItem.line) {
            return null;
        }

        const text = [
            routeItem.action === "Closure" ? "[Closure]" : routeItem.action,
            `[${relativePath(routeItem.filename)}](${routeItem.filename})`,
        ];

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const found = getRoutes().items.find((r) => r.name === param.value);

            if (found) {
                return null;
            }

            return notFound(
                "Route",
                param.value,
                detectedRange(param),
                "route",
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
        if (!config("route.completion", true)) {
            return [];
        }

        if (result.isParamIndex(1)) {
            // Route parameters autocomplete
            return getRoutes()
                .items.filter((route) => route.name === result.param(0).value)
                .map((route) => {
                    return route.parameters.map((parameter: string) => {
                        let completionItem = new vscode.CompletionItem(
                            parameter,
                            vscode.CompletionItemKind.Variable,
                        );

                        completionItem.range = document.getWordRangeAtPosition(
                            position,
                            wordMatchRegex,
                        );

                        return completionItem;
                    });
                })
                .flat();
        }

        // Route name autocomplete
        return getRoutes()
            .items.filter(
                (route) =>
                    typeof route.name === "string" && route.name.length > 0,
            )
            .map((route) => {
                let completionItem = new vscode.CompletionItem(
                    route.name,
                    vscode.CompletionItemKind.Enum,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                completionItem.detail = [
                    route.action,
                    `[${route.method}] ${route.uri}`,
                ].join("\n\n");

                return completionItem;
            });
    },
};
