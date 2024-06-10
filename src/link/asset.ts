import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getAssets } from "../repositories/asset";
import { findLinksInDoc } from "../support/doc";
import { assetMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, assetMatchRegex, (match) => {
        return (
            getAssets().items.find((item) => item.path === match[0])?.uri ??
            null
        );
    });
};

export default provider;
