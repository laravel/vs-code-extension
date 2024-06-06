import * as vscode from "vscode";
import { getAppBindings } from "../repositories/appBinding";
import { findWarningsInDoc } from "../support/doc";
import { appBindingMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): vscode.Diagnostic[] => {
    return findWarningsInDoc(doc, appBindingMatchRegex, (match, range) => {
        const appBinding = getAppBindings()[match[0]];

        if (appBinding) {
            return null;
        }

        return {
            message: `App binding [${match[0]}] not found.`,
            severity: vscode.DiagnosticSeverity.Warning,
            range,
            source: "Laravel Extension",
        };
    });
};

export default provider;
