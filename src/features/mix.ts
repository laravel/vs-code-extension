import { notFound } from "@src/diagnostic";
import { getMixManifest } from "@src/repositories/mix";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const toFind = {
    class: null,
    method: "mix",
};

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getMixManifest,
        ({ param }) => {
            const mixItem = getMixManifest().items.find(
                (i) => i.key === param.value,
            );

            if (!mixItem) {
                return null;
            }

            return new vscode.DocumentLink(detectedRange(param), mixItem.uri);
        },
    );
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    const items = getMixManifest().items;
    return findHoverMatchesInDoc(doc, pos, toFind, getMixManifest, (match) => {
        const item = items.find((item) => item.key === match);

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

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getMixManifest,
        ({ param }) => {
            const item = getMixManifest().items.find(
                (item) => item.key === param.value,
            );

            if (item) {
                return null;
            }

            return notFound(
                "Mix manifest item",
                param.value,
                detectedRange(param),
                "mix",
            );
        },
    );
};

export { diagnosticProvider, hoverProvider, linkProvider };
