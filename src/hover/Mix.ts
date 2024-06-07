import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getMixManifest } from "../repositories/mix";
import { findHoverMatchesInDoc } from "../support/doc";
import { mixManifestMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, mixManifestMatchRegex, (match) => {
        const item = getMixManifest().items.find((item) => item.key === match);

        if (!item) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                `[${relativePath(item.uri.path)}](${item.uri})`,
            ),
        );
    });
};

export default provider;
