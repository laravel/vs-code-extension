import { notFound } from "@src/diagnostic";
import { getPolicies } from "@src/repositories/auth";
import { findHoverMatchesInDoc, findLinksInDoc } from "@src/support/doc";
import { authMatchRegex } from "@src/support/patterns";
import { relativeMarkdownLink } from "@src/support/util";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";
import { findWarningsInDoc } from "../support/doc";

const hoverProvider: HoverProvider = (
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

const linkProvider: LinkProvider = (
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

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, authMatchRegex, (match, range) => {
        return getPolicies().whenLoaded((items) => {
            if (items[match[0]]) {
                return null;
            }

            return notFound("Policy", match[0], range, "auth");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
