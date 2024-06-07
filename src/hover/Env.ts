import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getEnv } from "../repositories/env";
import { findHoverMatchesInDoc } from "../support/doc";
import { envMatchRegex } from "../support/patterns";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, envMatchRegex, (match) => {
        const item = getEnv().items[match];

        if (!item || item.value === "") {
            return null;
        }

        return new vscode.Hover(new vscode.MarkdownString(`\`${item.value}\``));
    });
};

export default provider;
