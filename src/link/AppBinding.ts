import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getAppBindings } from "../repositories/appBinding";
import { findInDoc } from "../support/doc";
import { appBindingMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findInDoc(doc, appBindingMatchRegex, (match) => {
        return getAppBindings()[match[0]]?.uri ?? null;
    });
};

export default provider;
