import * as vscode from "vscode";
import { notFound } from ".";
import { getViews } from "../repositories/views";
import { findWarningsInDoc } from "../support/doc";
import { viewMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, viewMatchRegex, (match, range) => {
        return getViews().whenLoaded((items) => {
            const view = items[match[0]];

            if (view) {
                return null;
            }

            return notFound("View", match[0], range);
        });
    });
};

export default provider;
