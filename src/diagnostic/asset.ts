import * as vscode from "vscode";
import { notFound } from ".";
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

            return notFound("Asset", match[0], range, "asset");
        });
    });
};

export default provider;
