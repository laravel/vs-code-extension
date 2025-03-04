import { getBladeComponents } from "@src/repositories/bladeComponents";
import { config } from "@src/support/config";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    const links: vscode.DocumentLink[] = [];
    const text = doc.getText();
    const lines = text.split("\n");
    const components = getBladeComponents().items;
    const regexes = [new RegExp(/<\/?x-([^\s>]+)/)];

    if (components.prefixes.length > 0) {
        regexes.push(
            new RegExp(`<\\/?((${components.prefixes.join("|")})\\:[^\\s>]+)`),
        );
    }

    lines.forEach((line, index) => {
        for (const regex of regexes) {
            const match = line.match(regex);
            // get reflection properties for classes
            // auto complete them + hover?

            if (!match || match.index === undefined) {
                continue;
            }

            const component = components.components[match[1]];

            if (!component) {
                return;
            }

            const path =
                component.paths.find((p) => p.endsWith(".blade.php")) ||
                component.paths[0];

            links.push(
                new vscode.DocumentLink(
                    new vscode.Range(
                        new vscode.Position(index, match.index + 1),
                        new vscode.Position(
                            index,
                            match.index + match[0].length,
                        ),
                    ),
                    vscode.Uri.parse(projectPath(path)),
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

        const components = getBladeComponents().items;

        const componentPrefixes = ["x", "x-"].concat(components.prefixes);
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

        return Object.keys(components.components).map((key) => {
            if (key.includes("::") || !key.includes(":")) {
                return new vscode.CompletionItem(`x-${key}`);
            }

            return new vscode.CompletionItem(key);
        });
    },
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return null;
    // const links: vscode.DocumentLink[] = [];
    // const text = doc.getText();
    // const lines = text.split("\n");
    // const views = getBladeComponents().items;

    // lines.forEach((line, index) => {
    //     const match = line.match(/<\/?x-([^\s>]+)/);

    //     if (match && match.index !== undefined) {
    //         const componentName = match[1];
    //         // Standard component
    //         const viewName = `components.${componentName}`;
    //         // Index component
    //         const indexName = `${viewName}.index`;
    //         // Index component (via same name)
    //         const sameIndexName = `${viewName}.${componentName.split(".").pop()}`;

    //         const possibleNames = [
    //             componentName,
    //             viewName,
    //             indexName,
    //             sameIndexName,
    //         ];

    //         const view = views.find((v) => possibleNames.includes(v.key));

    //         if (!view) {
    //             return;
    //         }

    //         // return new vscode.Hover(
    //         //     new vscode.MarkdownString(
    //         //         `[${item.path}](${
    //         //             vscode.Uri.file(projectPath(item.path)).fsPath
    //         //         })`,
    //         //     ),
    //         // );
    //         //     new vscode.DocumentLink(
    //         //         new vscode.Range(
    //         //             new vscode.Position(index, match.index + 1),
    //         //             new vscode.Position(
    //         //                 index,
    //         //                 match.index + match[0].length,
    //         //             ),
    //         //         ),
    //         //         vscode.Uri.parse(projectPath(view.path)),
    //         //     ),
    //         // );
    //     }
    // });

    // return null;
    // return Promise.resolve(links);
    // return findHoverMatchesInDoc(doc, pos, toFind, getBladeComponents, (match) => {
    //     const item = getBladeComponents().items.find((view) => view.key === match);

    //     if (!item) {
    //         return null;
    //     }

    //     return new vscode.Hover(
    //         new vscode.MarkdownString(
    //             `[${item.path}](${
    //                 vscode.Uri.file(projectPath(item.path)).fsPath
    //             })`,
    //         ),
    //     );
    // });
};
