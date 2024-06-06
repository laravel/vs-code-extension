import * as vscode from "vscode";
import { getInertiaViews } from "../repositories/inertia";
import { findWarningsInDoc } from "../support/doc";
import { inertiaMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): vscode.Diagnostic[] => {
    return findWarningsInDoc(doc, inertiaMatchRegex, (match, range) => {
        const view = getInertiaViews()[match[0]];

        if (view) {
            return null;
        }

        return {
            message: `Inertia view [${match[0]}] not found.`,
            severity: vscode.DiagnosticSeverity.Warning,
            range,
            source: "Laravel Extension",
        };
    });
};

export default provider;
