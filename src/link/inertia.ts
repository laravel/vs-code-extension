import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getInertiaViews } from "../repositories/inertia";
import { findLinksInDoc } from "../support/doc";
import { inertiaMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, inertiaMatchRegex, (match) => {
        return getInertiaViews().items[match[0]]?.uri ?? null;
    });
};

export default provider;
