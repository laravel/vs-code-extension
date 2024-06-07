import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getAppBindings } from "../repositories/appBinding";
import { findLinksInDoc } from "../support/doc";
import { appBindingMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, appBindingMatchRegex, (match) => {
        return getAppBindings().items[match[0]]?.uri ?? null;
    });
};

export default provider;
