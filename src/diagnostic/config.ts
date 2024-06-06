import * as vscode from "vscode";
import { getConfigs } from "../repositories/configs";
import { findWarningsInDoc } from "../support/doc";
import { configMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): vscode.Diagnostic[] => {
    return findWarningsInDoc(doc, configMatchRegex, (match, range) => {
        const config = getConfigs().find((item) => item.name === match[0]);

        if (config) {
            return null;
        }

        return {
            message: `Config [${match[0]}] not found.`,
            severity: vscode.DiagnosticSeverity.Warning,
            range,
            source: "Laravel Extension",
        };
    });
};

export default provider;
