import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getMiddleware } from "@src/repositories/middleware";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import {
    DetectResultParam,
    DetectResultStringParam,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind = {
    class: facade("Route"),
    method: ["middleware", "withoutMiddleware"],
};

const getName = (match: string) => {
    return match.split(":").shift() ?? "";
};

const processParam = <T>(
    param: DetectResultParam,
    cb: (value: DetectResultStringParam) => T | null,
) => {
    if (param.type === "string") {
        return cb(param);
    }

    return param.value
        .map(({ value }) => {
            return value.type === "string" ? cb(value) : null;
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

                if (!route || !route.uri) {
                    return null;
                }

                return new vscode.DocumentLink(detectedRange(value), route.uri);
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

            if (item?.uri) {
                const text = [
                    `[${relativePath(item.uri.path)}](${item.uri.path})`,
                ];

                return new vscode.Hover(
                    new vscode.MarkdownString(text.join("\n\n")),
                );
            }

            if (item.groups.length === 0) {
                return null;
            }

            const text = item.groups.map((i) =>
                i.uri
                    ? `[${relativePath(i.uri.path)}](${i.uri.toString()})`
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
