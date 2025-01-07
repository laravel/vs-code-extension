import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getMiddleware } from "@src/repositories/middleware";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { facade } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import * as vscode from "vscode";
import { FeatureTag, HoverProvider, LinkProvider } from "..";

const toFind: FeatureTag = {
    class: facade("Route"),
    method: ["middleware", "withoutMiddleware"],
};

const getName = (match: string) => {
    return match.split(":").shift() ?? "";
};

const processParam = <T>(
    param: AutocompleteParsingResult.ContextValue,
    cb: (value: AutocompleteParsingResult.StringValue) => T | null,
) => {
    if (param.type === "string") {
        return cb(param);
    }

    return (param as AutocompleteParsingResult.ArrayValue).children
        .map(({ value }) => {
            return value?.type === "string" ? cb(value) : null;
        })
        .filter((i: T | null) => i !== null);
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string" | "array">(
        doc,
        toFind,
        getMiddleware,
        ({ param }) => {
            const routes = getMiddleware().items;

            return processParam(param, (value) => {
                const route = routes[getName(value.value)];

                if (!route || !route.path) {
                    return null;
                }

                return new vscode.DocumentLink(
                    detectedRange(value),
                    vscode.Uri.file(projectPath(route.path)).with({
                        fragment: `L${route.line}`,
                    }),
                );
            });
        },
        ["string", "array"],
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(
        doc,
        pos,
        toFind,
        getMiddleware,
        (match) => {
            const item = getMiddleware().items[getName(match)];

            if (item?.path) {
                const text = [
                    `[${item.path}](${vscode.Uri.file(
                        projectPath(item.path),
                    ).with({
                        fragment: `L${item.line}`,
                    })})`,
                ];

                return new vscode.Hover(
                    new vscode.MarkdownString(text.join("\n\n")),
                );
            }

            if (item.groups.length === 0) {
                return null;
            }

            const text = item.groups.map((i) =>
                i.path
                    ? `[${i.path}](${vscode.Uri.file(projectPath(i.path)).with({
                          fragment: `L${i.line}`,
                      })})`
                    : i.class,
            );

            return new vscode.Hover(
                new vscode.MarkdownString(text.join("\n\n")),
            );
        },
        ["string", "array"],
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string" | "array">(
        doc,
        toFind,
        getMiddleware,
        ({ param }) => {
            const routes = getMiddleware().items;

            return processParam(param, (value) => {
                const route = routes[getName(value.value)];

                if (route) {
                    return null;
                }

                return notFound(
                    "Middleware",
                    value.value,
                    detectedRange(value),
                    "middleware",
                );
            });
        },
        ["string", "array"],
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
        if (!config("middleware.completion", true)) {
            return [];
        }

        return Object.entries(getMiddleware().items).map(([key, value]) => {
            let completionItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Enum,
            );

            completionItem.detail = value.parameters ?? "";

            completionItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completionItem;
        });
    },
};
