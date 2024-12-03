import { notFound } from "@src/diagnostic";
import { getTranslations } from "@src/repositories/translations";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const toFind = {
    class: null,
    method: ["trans", "__"],
};

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getTranslations,
        ({ param }) => {
            const translation = getTranslations().items[param.value];

            if (!translation) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(translation.default.path).with({
                    fragment: `L${translation.default.line}`,
                }),
            );
        },
    );
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getTranslations, (match) => {
        const item = getTranslations().items[match];

        if (!item) {
            return null;
        }

        const text = Object.entries(item)
            .filter(([key]) => key !== "default")
            .map(([key, translation]) => {
                return [
                    `\`${key}\`: ${translation.value}`,
                    `[${relativePath(translation.path)}](${vscode.Uri.file(
                        translation.path,
                    ).with({
                        fragment: `L${translation.line}`,
                    })})`,
                ];
            })
            .flat();

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getTranslations,
        ({ param }) => {
            const item = getTranslations().items[param.value];

            if (item) {
                return null;
            }

            return notFound(
                "Translation",
                param.value,
                detectedRange(param),
                "translation",
            );
        },
    );
};

export { diagnosticProvider, hoverProvider, linkProvider };
