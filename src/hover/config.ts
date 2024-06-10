import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getConfigs } from "../repositories/configs";
import { findHoverMatchesInDoc } from "../support/doc";
import { configMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, configMatchRegex, (match) => {
        const item = getConfigs().items.find((config) => config.name === match);

        if (!item) {
            return null;
        }

        const text = [];

        if (item.value !== null) {
            text.push("`" + item.value + "`");
        }

        if (item.uri) {
            text.push(`[${relativePath(item.uri.path)}](${item.uri.fsPath})`);
        }

        if (text.length === 0) {
            return null;
        }

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

export default provider;
