import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getInertiaViews } from "../repositories/inertia";
import { findHoverMatchesInDoc } from "../support/doc";
import { inertiaMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, inertiaMatchRegex, (match) => {
        const item = getInertiaViews().items[match];

        if (!item) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                `[${relativePath(item.uri.path)}](${item.uri.fsPath})`,
            ),
        );
    });
};

export default provider;
