import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getRoutes } from "../repositories/routes";
import { findHoverMatchesInDoc } from "../support/doc";
import { routeMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, routeMatchRegex, (match) => {
        const item = getRoutes().items.find((item) => item.name === match);

        if (!item) {
            return null;
        }

        const text = [
            item.action === "Closure" ? "[Closure]" : item.action,
            `[${relativePath(item.filename)}](${item.filename})`,
        ];

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

export default provider;
