import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";
import { notFound } from "../diagnostic";
import { getAppBindings } from "../repositories/appBinding";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "../support/doc";
import { appBindingMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, appBindingMatchRegex, (match) => {
        const item = getAppBindings().items[match];

        if (!item) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                [
                    "`" + item.class + "`",
                    `[${relativePath(item.uri.path)}](${item.uri})`,
                ].join("\n\n"),
            ),
        );
    });
};

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, appBindingMatchRegex, (match) => {
        return getAppBindings().items[match[0]]?.uri ?? null;
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, appBindingMatchRegex, (match, range) => {
        return getAppBindings().whenLoaded((items) => {
            const appBinding = items[match[0]];

            if (appBinding) {
                return null;
            }

            return notFound("App binding", match[0], range, "appBinding");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
