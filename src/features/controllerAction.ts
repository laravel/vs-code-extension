import { notFound } from "@/diagnostic";
import { findWarningsInDoc } from "@/support/doc";
import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getRoutes } from "../repositories/routes";
import { findLinksInDoc } from "../support/doc";
import { controllerActionRegex } from "../support/patterns";

const linkProvider: LinkProvider = (
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

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(
        doc,
        controllerActionRegex,
        (match, range) => {
            return getRoutes().whenLoaded((items) => {
                const action = match[3];

                if (!action.includes("@")) {
                    // Intelliphense can take it from here
                    return null;
                }

                const item = items.find((item) => item.action === action);

                if (item) {
                    return null;
                }

                return notFound(
                    "Controller/Method",
                    match[3],
                    range,
                    "controllerAction",
                );
            });
        },
        3,
    );
};

export { diagnosticProvider, linkProvider };
