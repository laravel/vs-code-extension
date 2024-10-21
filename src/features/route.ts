import { notFound } from "@/diagnostic";
import { getRoutes } from "@/repositories/routes";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@/support/doc";
import { routeMatchRegex } from "@/support/patterns";
import { relativePath } from "@/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, routeMatchRegex, (match) => {
        const route = getRoutes().items.find((item) => item.name === match[0]);

        if (!route || !route.filename || !route.line) {
            return null;
        }

        return vscode.Uri.file(route.filename).with({
            fragment: `L${route.line}`,
        });
    });
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, routeMatchRegex, (match) => {
        const item = getRoutes().items.find((item) => item.name === match);

        if (!item || !item.filename || !item.line) {
            return null;
        }

        const text = [
            item.action === "Closure" ? "[Closure]" : item.action,
            `[${relativePath(item.filename)}](${item.filename})`,
        ];

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, routeMatchRegex, (match, range) => {
        return getRoutes().whenLoaded((items) => {
            const item = items.find((item) => item.name === match[0]);

            if (item) {
                return null;
            }

            return notFound("Route", match[0], range, "route");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
