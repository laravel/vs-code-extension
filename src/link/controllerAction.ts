import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getRoutes } from "../repositories/routes";
import { findLinksInDoc } from "../support/doc";
import { controllerActionRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(
        doc,
        controllerActionRegex,
        (match) => {
            const action = match[3];

            if (!action.includes("@")) {
                // Intelliphense can take it from here
                return null;
            }

            const route = getRoutes().items.find(
                (item) => item.action === action,
            );

            if (!route || !route.filename || !route.line) {
                return null;
            }

            return vscode.Uri.file(route.filename).with({
                fragment: `L${route.line}`,
            });
        },
        3,
    );
};

export default provider;
