import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getMixManifest } from "../repositories/mix";
import { findLinksInDoc } from "../support/doc";
import { mixManifestMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, mixManifestMatchRegex, (match) => {
        return (
            getMixManifest().items.find((item) => item.key === match[0])?.uri ??
            null
        );
    });
};

export default provider;
