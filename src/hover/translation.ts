import * as vscode from "vscode";
import { HoverProvider } from "..";
import { getTranslations } from "../repositories/translations";
import { findHoverMatchesInDoc } from "../support/doc";
import { translationBindingMatchRegex } from "../support/patterns";
import { relativePath } from "../support/project";

const provider: HoverProvider = (
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

export default provider;
