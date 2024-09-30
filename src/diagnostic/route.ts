import * as vscode from "vscode";
import { notFound } from ".";
import { getRoutes } from "../repositories/routes";
import { findWarningsInDoc } from "../support/doc";
import { routeMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
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

export default provider;
