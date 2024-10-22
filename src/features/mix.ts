import { notFound } from "@src/diagnostic";
import { getMixManifest } from "@src/repositories/mix";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@src/support/doc";
import { mixManifestMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, mixManifestMatchRegex, (match) => {
        return (
            getMixManifest().items.find((item) => item.key === match[0])?.uri ??
            null
        );
    });
};

const hoverProvider: HoverProvider = (
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

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, mixManifestMatchRegex, (match, range) => {
        return getMixManifest().whenLoaded((items) => {
            const item = items.find((item) => item.key === match[0]);

            if (item) {
                return null;
            }

            return notFound("Mix manifest item", match[0], range, "mix");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
