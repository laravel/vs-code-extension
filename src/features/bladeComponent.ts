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
        const match = line.match(/<\/?x-([^\s>]+)/);

        if (match && match.index !== undefined) {
            const componentName = match[1];
            // Standard component
            const viewName = "components." + componentName;
            // Index component
            const indexName = `${viewName}.index`;
            // Index component (via same name)
            const sameIndexName = `${viewName}.${componentName.split(".").pop()}`;

            const view = views.find((v) =>
                [viewName, indexName, sameIndexName].includes(v.key),
            );

            if (!view) {
                return;
            }

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
    });

    return Promise.resolve(links);
};

export const completionProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(
        doc: vscode.TextDocument,
        pos: vscode.Position,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (!config("bladeComponent.completion", true)) {
            return undefined;
        }

        const componentPrefixes = ["x", "x-"];
        const pathPrefix = "components.";
        const line = doc.lineAt(pos.line).text;

        const match = componentPrefixes.find((prefix) => {
            const linePrefix = line.substring(
                pos.character - prefix.length,
                pos.character,
            );

            return linePrefix !== prefix;
        });

        if (!match) {
            return undefined;
        }

        return getViews()
            .items.filter((view) => view.key.startsWith(pathPrefix))
            .map((view) => {
                const parts = view.key.split(".");

                if (parts[parts.length - 1] === "index") {
                    parts.pop();
                }

                while (
                    parts.length > 1 &&
                    parts[parts.length - 1] === parts[parts.length - 2]
                ) {
                    parts.pop();
                }

                return new vscode.CompletionItem(
                    "x-" + parts.join(".").replace(pathPrefix, ""),
                );
            });
    },
};
