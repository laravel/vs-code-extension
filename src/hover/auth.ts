import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getPolicies } from "../repositories/auth";
import { findHoverMatchesInDoc } from "../support/doc";
import { authMatchRegex } from "../support/patterns";
import { relativeMarkdownLink } from "../support/util";

const provider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, authMatchRegex, (match) => {
        const items = getPolicies().items[match];

        if (!items || items.length === 0) {
            return null;
        }

        const text: string[] = [];

        items.forEach((item) => {
            if (item.policy_class) {
                text.push(
                    [
                        "`" + item.policy_class + "`",
                        relativeMarkdownLink(
                            vscode.Uri.file(item.uri).with({
                                fragment: `L${item.lineNumber}`,
                            }),
                        ),
                    ].join("\n\n"),
                );
            } else {
                text.push(
                    relativeMarkdownLink(
                        vscode.Uri.file(item.uri).with({
                            fragment: `L${item.lineNumber}`,
                        }),
                    ),
                );
            }
        });

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

export default provider;
