import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getAppBindings } from "../repositories/appBinding";
import { getMatch } from "../support/doc";
import { appBindingMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return getMatch(doc, pos, appBindingMatchRegex, (match) => {
        const item = getAppBindings()[match];

        if (!item) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                [
                    "`" + item.class + "`",
                    `[${relativePath(item.uri.path)}](${item.uri})`,
                ].join("\n\n"),
            ),
        );
    });
};

export default provider;
