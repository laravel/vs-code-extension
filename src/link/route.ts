import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getRoutes } from "../repositories/routes";
import { findLinksInDoc } from "../support/doc";
import { routeMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, routeMatchRegex, (match) => {
        const route = getRoutes().items.find((item) => item.name === match[0]);

        if (!route) {
            return null;
        }

        return vscode.Uri.file(route.filename).with({
            fragment: `L${route.line}`,
        });
    });
};

export default provider;
