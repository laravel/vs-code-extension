import { notFound } from "@/diagnostic";
import { getAssets } from "@/repositories/asset";
import { findLinksInDoc, findWarningsInDoc } from "@/support/doc";
import { assetMatchRegex } from "@/support/patterns";
import * as vscode from "vscode";
import { LinkProvider } from "..";

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, assetMatchRegex, (match) => {
        return (
            getAssets().items.find((item) => item.path === match[0])?.uri ??
            null
        );
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, assetMatchRegex, (match, range) => {
        return getAssets().whenLoaded((items) => {
            const asset = items.find((item) => item.path === match[0]);

            if (asset) {
                return null;
            }

            return notFound("Asset", match[0], range, "asset");
        });
    });
};

export { diagnosticProvider, linkProvider };
