import { notFound } from "@/diagnostic";
import { getMiddleware } from "@/repositories/middleware";
import { findWarningsInDoc } from "@/support/doc";
import { middlewareMatchRegex } from "@/support/patterns";
import * as vscode from "vscode";

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, middlewareMatchRegex, (match, range) => {
        return getMiddleware().whenLoaded((items) => {
            const item = items[match[0]];

            if (item) {
                return null;
            }

            return notFound("Middleware", match[0], range, "middleware");
        });
    });
};

export { diagnosticProvider };
