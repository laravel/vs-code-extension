import { notFound } from "@src/diagnostic";
import { getMiddleware } from "@src/repositories/middleware";
import { findWarningsInDoc } from "@src/support/doc";
import { middlewareMatchRegex } from "@src/support/patterns";
import * as vscode from "vscode";

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, middlewareMatchRegex, (match, range) => {
        return getMiddleware().whenLoaded((items) => {
            const finalMatch = match[0].split(":").shift() ?? "";
            const item = items[finalMatch];

            if (item) {
                return null;
            }

            return notFound("Middleware", finalMatch, range, "middleware");
        });
    });
};

export { diagnosticProvider };
