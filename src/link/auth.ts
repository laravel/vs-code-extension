import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getPolicies } from "../repositories/auth";
import { findLinksInDoc } from "../support/doc";
import { authMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, authMatchRegex, (match) => {
        const items = getPolicies().items[match[0]];

        if (items.length === 1 && items[0].uri) {
            return vscode.Uri.file(items[0].uri).with({
                fragment: `L${items[0].lineNumber}`,
            });
        }

        return null;
    });
};

export default provider;
