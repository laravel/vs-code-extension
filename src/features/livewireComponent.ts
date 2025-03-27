import { getLivewireComponents } from "@src/repositories/livewireComponents";
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
            .items.filter((view) => view.key.startsWith(pathPrefix))
            .map(
                (view) =>
                    new vscode.CompletionItem(view.key.replace(pathPrefix, "")),
            );
    },
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    const components = getLivewireComponents().items;
    const regex = new RegExp(/<\/?livewire:([^\s>]+)/);

    const linkRange = doc.getWordRangeAtPosition(pos, regex);

    if (!linkRange) {
        return null;
    }

    const match = doc
        .getText(linkRange)
        .replace("<", "")
        .replace("livewire:", "");

    const component = components.components[match];

    console.log('wchodzimy', components);

    if (!component) {
        return null;
    }

    const lines = component.paths.map(
        (path) => `[${path}](${vscode.Uri.file(projectPath(path))})`,
    );

    lines.push(
        ...component.props.map((prop) =>
            [
                "`" + prop.type + "` ",
                "`" + prop.name + "`",
                prop.default ? ` = ${prop.default}` : "",
            ].join(""),
        ),
    );

    return new vscode.Hover(new vscode.MarkdownString(lines.join("\n\n")));
};
