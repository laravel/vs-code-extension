import * as vscode from "vscode";
import { notFound } from ".";
import { getInertiaViews } from "../repositories/inertia";
import { findWarningsInDoc } from "../support/doc";
import { inertiaMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, inertiaMatchRegex, (match, range) => {
        return getInertiaViews().whenLoaded((items) => {
            const view = items[match[0]];

            if (view) {
                return null;
            }

            return notFound("Inertia view", match[0], range);
        });
    });
};

export default provider;
