import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getConfigs } from "../repositories/configs";
import { findInDoc } from "../support/doc";
import { configMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findInDoc(doc, configMatchRegex, (match) => {
        return getConfigs().find((item) => item.name === match[0])?.uri ?? null;
    });
};

export default provider;
