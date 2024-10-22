import { notFound } from "@src/diagnostic";
import { HoverProvider, LinkProvider } from "@src/index";
import { getInertiaViews } from "@src/repositories/inertia";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@src/support/doc";
import { inertiaMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, inertiaMatchRegex, (match) => {
        return getInertiaViews().items[match[0]]?.uri ?? null;
    });
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, inertiaMatchRegex, (match) => {
        const item = getInertiaViews().items[match];

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
    return findWarningsInDoc(doc, inertiaMatchRegex, (match, range) => {
        return getInertiaViews().whenLoaded((items) => {
            const view = items[match[0]];

            if (view) {
                return null;
            }

            return notFound("Inertia view", match[0], range, "inertia");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
