import * as vscode from "vscode";
import { getEnv } from "../repositories/env";
import { findWarningsInDoc } from "../support/doc";
import { envMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): vscode.Diagnostic[] => {
    return findWarningsInDoc(doc, envMatchRegex, (match, range) => {
        const env = getEnv()[match[0]];

        if (env) {
            return null;
        }

        return {
            message: `[${match[0]}] not found in .env.`,
            severity: vscode.DiagnosticSeverity.Warning,
            range,
            source: "Laravel Extension",
        };
    });
};

export default provider;
