import * as vscode from "vscode";
import { notFound } from ".";
import { getAppBindings } from "../repositories/appBinding";
import { findWarningsInDoc } from "../support/doc";
import { appBindingMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
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

export default provider;
