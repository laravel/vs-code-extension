import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getViews } from "../repositories/views";
import { findInDoc } from "../support/doc";
import { viewMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findInDoc(doc, viewMatchRegex, (match) => {
        return getViews()[match[0]]?.uri ?? null;
    });
};

export default provider;
