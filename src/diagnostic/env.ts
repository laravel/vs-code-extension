import * as vscode from "vscode";
import { getEnv } from "../repositories/env";
import { findWarningsInDoc } from "../support/doc";
import { envMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, envMatchRegex, (match, range) => {
        return getEnv().whenLoaded((items) => {
            const env = items[match[0]];

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
    });
};

export default provider;
