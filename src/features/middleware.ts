import { notFound } from "@src/diagnostic";
import { getMiddleware } from "@src/repositories/middleware";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@src/support/doc";
import { middlewareMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, middlewareMatchRegex, (match, range) => {
        return getMiddleware().whenLoaded((items) => {
            const finalMatch = match[0].split(":").shift() ?? "";
            const item = items[finalMatch];

            if (item) {
                return null;
            }

            return notFound("Middleware", finalMatch, range, "middleware");
        });
    });
};

export const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, middlewareMatchRegex, (match) => {
        const route = getMiddleware().items[match[0]];

        if (!route || !route.uri) {
            return null;
        }

        return route.uri;
    });
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, middlewareMatchRegex, (match) => {
        const item = getMiddleware().items[match];

        if (!item || !item.uri) {
            return null;
        }

        const text = [`[${relativePath(item.uri.path)}](${item.uri.path})`];

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};
