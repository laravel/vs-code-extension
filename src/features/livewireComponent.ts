import { getViews } from "@src/repositories/views";
import { config } from "@src/support/config";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    const links: vscode.DocumentLink[] = [];
    const text = doc.getText();
    const lines = text.split("\n");
    const views = getViews().items;

    lines.forEach((line, index) => {
        const match = line.match(/<\/?livewire:([^\s>]+)/);

        if (match && match.index !== undefined) {
            const componentName = match[1];

            const view = views.find((v) => {
                return (
                    v.key === `livewire.${componentName}` ||
                    (v.livewire && v.key === componentName)
                );
            });

            if (view) {
                links.push(
                    new vscode.DocumentLink(
                        new vscode.Range(
                            new vscode.Position(index, match.index + 1),
                            new vscode.Position(
                                index,
                                match.index + match[0].length,
                            ),
                        ),
                        vscode.Uri.file(projectPath(view.path)),
                    ),
                );
            }
        }
    });

    return Promise.resolve(links);
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    const linkRange = doc.getWordRangeAtPosition(pos, /<\/?livewire:([^\s>]+)/);

    if (!linkRange) {
        return;
    }

    const views = getViews().items;

    const match = doc
        .getText(linkRange)
        .replace("<", "")
        .replace("/", "")
        .replace("livewire:", "");

    const view = views.find((view) => view.key === match);

    if (!view || !view.livewire) {
        return null;
    }

    const lines = [
        `[${view.path}](${vscode.Uri.file(projectPath(view.path))})`,
    ];

    lines.push(
        ...view.livewire.props.map((prop) =>
            [
                "`" + prop.type + "` ",
                `\`\$${prop.name} ${prop.hasDefaultValue ? ` = ${prop.defaultValue}` : ""}\``,
            ].join(""),
        ),
    );

    return new vscode.Hover(new vscode.MarkdownString(lines.join("\n\n")));
};

export const completionProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(
        doc: vscode.TextDocument,
        pos: vscode.Position,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (!config("livewireComponent.completion", true)) {
            return undefined;
        }

        const componentPrefix = "<livewire:";
        const pathPrefix = "livewire.";
        const line = doc.lineAt(pos.line).text;
        const linePrefix = line.substring(
            pos.character - componentPrefix.length,
            pos.character,
        );

        if (linePrefix !== componentPrefix) {
            return undefined;
        }

        return getViews()
            .items.filter((view) => view.livewire)
            .map(
                (view) =>
                    new vscode.CompletionItem(view.key.replace(pathPrefix, "")),
            );
    },
};
