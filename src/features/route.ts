import { notFound } from "@src/diagnostic";
import { getRoutes } from "@src/repositories/routes";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const toFind = { class: null, method: ["route", "signedRoute", "to_route"] };

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param }) => {
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

const hoverProvider: HoverProvider = (
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

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param }) => {
            const item = getRoutes().items.find((r) => r.name === param.value);

            if (item) {
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

export { diagnosticProvider, hoverProvider, linkProvider };
