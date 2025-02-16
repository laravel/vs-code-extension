import { getViews } from "@src/repositories/views";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { LinkProvider } from "..";

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    const links: vscode.DocumentLink[] = [];
    const text = doc.getText();
    const lines = text.split("\n");
    const views = getViews().items;

    lines.forEach((line, index) => {
        const match = line.match(/<\/?livewire:([^\s>]+)/);

        if (match && match.index !== undefined) {
            const componentName = match[1];
            // Standard component
            const viewName = `livewire.${componentName}`;
            // Index component
            const view = views.find((v) => v.key === viewName);

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
                        vscode.Uri.parse(projectPath(view.path)),
                    ),
                );
            }
        }
    });

    return Promise.resolve(links);
};

export const completionProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(
        doc: vscode.TextDocument,
        pos: vscode.Position,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
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
            .items.filter((view) => view.key.startsWith(pathPrefix))
            .map(
                (view) =>
                    new vscode.CompletionItem(view.key.replace(pathPrefix, "")),
            );
    },
};
