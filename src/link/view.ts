import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getViews } from "../repositories/views";
import { findLinksInDoc } from "../support/doc";
import { viewMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, viewMatchRegex, (match) => {
        return getViews().items[match[0]]?.uri ?? null;
    });
};

export default provider;
