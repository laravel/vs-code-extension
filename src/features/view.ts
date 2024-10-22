import { notFound } from "@src/diagnostic";
import { HoverProvider, LinkProvider } from "@src/index";
import { getViews } from "@src/repositories/views";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@src/support/doc";
import { viewMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, viewMatchRegex, (match) => {
        return getViews().items[match[0]]?.uri ?? null;
    });
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, viewMatchRegex, (match) => {
        const item = getViews().items[match];

        if (!item) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                `[${relativePath(item.uri.path)}](${item.uri.fsPath})`,
            ),
        );
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, viewMatchRegex, (match, range) => {
        return getViews().whenLoaded((items) => {
            const view = items[match[0]];

            if (view) {
                return null;
            }

            return notFound("View", match[0], range, "view");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
