import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getViews } from "../repositories/views";
import { getMatch } from "../support/doc";
import { viewMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return getMatch(doc, pos, viewMatchRegex, (match) => {
        const item = getViews()[match];

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
