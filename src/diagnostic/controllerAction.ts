import * as vscode from "vscode";
import { notFound } from ".";
import { getRoutes } from "../repositories/routes";
import { findWarningsInDoc } from "../support/doc";
import { controllerActionRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
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

export default provider;
