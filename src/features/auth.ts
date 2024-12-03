import { notFound } from "@src/diagnostic";
import { getPolicies } from "@src/repositories/auth";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { facade, relativeMarkdownLink } from "@src/support/util";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const toFind = [
    {
        class: facade("Gate"),
        method: [
            "has",
            "allows",
            "denies",
            "check",
            "any",
            "none",
            "authorize",
            "inspect",
        ],
    },
    {
        class: null,
        method: "can",
    },
    // "@can",
    // "@cannot",
    // "@canany",
];

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getPolicies,
        ({ param }) => {
            const policy = getPolicies().items[param.value];

            if (!policy || policy.length === 0) {
                return null;
            }

            return policy.map((item) => {
                return new vscode.DocumentLink(
                    detectedRange(param),
                    vscode.Uri.file(item.uri).with({
                        fragment: `L${item.lineNumber}`,
                    }),
                );
            });
        },
    );
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getPolicies, (match) => {
        const items = getPolicies().items[match];

        if (!items || items.length === 0) {
            return null;
        }

        const text = items.map((item) => {
            if (item.policy_class) {
                return [
                    "`" + item.policy_class + "`",
                    relativeMarkdownLink(
                        vscode.Uri.file(item.uri).with({
                            fragment: `L${item.lineNumber}`,
                        }),
                    ),
                ].join("\n\n");
            }

            return relativeMarkdownLink(
                vscode.Uri.file(item.uri).with({
                    fragment: `L${item.lineNumber}`,
                }),
            );
        });

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getPolicies,
        ({ param }) => {
            if (getPolicies().items[param.value]) {
                return null;
            }

            return notFound(
                "Policy",
                param.value,
                detectedRange(param),
                "auth",
            );
        },
    );
};

export { diagnosticProvider, hoverProvider, linkProvider };
