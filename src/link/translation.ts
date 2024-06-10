import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getTranslations } from "../repositories/translations";
import { findLinksInDoc } from "../support/doc";
import { translationBindingMatchRegex } from "../support/patterns";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, translationBindingMatchRegex, (match) => {
        const item = getTranslations().items[match[0]];

        if (!item) {
            return null;
        }

        return vscode.Uri.file(item.default.path).with({
            fragment: `L${item.default.line}`,
        });
    });
};

export default provider;
