import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getRoutes } from "../repositories/routes";
import { findLinksInDoc } from "../support/doc";
import { controllerActionRegex } from "../support/patterns";

const getFullAction = (action: string): string | null => {
    if (!action.includes("@")) {
        // Intelliphense can take it from here
        return null;
    }

    return action
        .substring(1)
        .slice(0, -1)
        .replace("App\\Http\\Controllers\\", "");
};

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(
        doc,
        controllerActionRegex,
        (match) => {
            const action = match[3];

            const fullAction = getFullAction(action);

            if (!fullAction) {
                return null;
            }

            const route = getRoutes().items.find(
                (item) => item.action === fullAction,
            );

            if (!route) {
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
