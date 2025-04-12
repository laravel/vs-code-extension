import { getLivewireComponents } from "@src/repositories/livewireComponents";
import { getViews } from "@src/repositories/views";
import { config } from "@src/support/config";
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
                        vscode.Uri.file(projectPath(view.path)),
                    ),
                );
            }
        }
    });

    return Promise.resolve(links);
};

export const completionAttributeProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(
        doc: vscode.TextDocument,
        pos: vscode.Position,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (!config("livewireComponent.completion_attribute", true)) {
            return undefined;
        }

        const components = getLivewireComponents().items;
        const text = doc.getText(new vscode.Range(new vscode.Position(0, 0), pos));

        const regexes = [new RegExp(/<livewire:([^\s>]+)[^>]*:$/)];

        for (const regex of regexes) {
            const match = text.match(regex);

            if (!match || match.index === undefined) {
                continue;
            }

            const component = components.components[match[1]];

            if (!component) {
                return undefined;
            }

            return Object.entries(component.props).map(([, value]) => {
                let completeItem = new vscode.CompletionItem(
                    value.name,
                    vscode.CompletionItemKind.Property,
                );

                completeItem.detail = value.type;

                return completeItem;
            });
        }

        return undefined;
    }
};

export const completionComponentProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(
        doc: vscode.TextDocument,
        pos: vscode.Position,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (!config("livewireComponent.completion_component", true)) {
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
            .items.filter((view) => view.key.startsWith(pathPrefix))
            .map(
                (view) =>
                    new vscode.CompletionItem(view.key.replace(pathPrefix, "")),
            );
    },
};
