import * as vscode from "vscode";
import { getAssets } from "../repositories/asset";
import { findWarningsInDoc } from "../support/doc";
import { assetMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, assetMatchRegex, (match, range) => {
        return getAssets().whenLoaded((items) => {
            const asset = items.find((item) => item.path === match[0]);

            if (asset) {
                return null;
            }

            return {
                message: `Asset [${match[0]}] not found.`,
                severity: vscode.DiagnosticSeverity.Warning,
                range,
                source: "Laravel Extension",
            };
        });
    });
};

export default provider;
