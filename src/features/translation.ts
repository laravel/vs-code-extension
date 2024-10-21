import { notFound } from "@/diagnostic";
import { getTranslations } from "@/repositories/translations";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@/support/doc";
import { translationBindingMatchRegex } from "@/support/patterns";
import { relativePath } from "@/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, translationBindingMatchRegex, (match) => {
        const item = getTranslations().items[match[0]];

        if (!item) {
            return null;
        }

        return vscode.Uri.file(item.default.path).with({
            fragment: `L${item.default.line}`,
        });
    });
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(
        doc,
        pos,
        translationBindingMatchRegex,
        (match) => {
            const item = getTranslations().items[match];

            if (!item) {
                return null;
            }

            const text = Object.entries(item)
                .filter(([key, translation]) => key !== "default")
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

            return new vscode.Hover(
                new vscode.MarkdownString(text.join("\n\n")),
            );
        },
    );
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(
        doc,
        translationBindingMatchRegex,
        (match, range) => {
            return getTranslations().whenLoaded((items) => {
                const item = items[match[0]];

                if (item) {
                    return null;
                }

                return notFound("Translation", match[0], range, "translation");
            });
        },
    );
};

export { diagnosticProvider, hoverProvider, linkProvider };
