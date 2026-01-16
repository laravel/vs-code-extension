import { getBladeComponents } from "@src/repositories/bladeComponents";
import { config } from "@src/support/config";
import { projectPath } from "@src/support/project";
import { defaultToString } from "@src/support/util";
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
                    vscode.Uri.file(projectPath(path)),
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

            return linePrefix === prefix;
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
    const components = getBladeComponents().items;
    const regexes = [new RegExp(/<\/?x-([^\s>]+)/)];

    if (components.prefixes.length > 0) {
        regexes.push(
            new RegExp(`<\\/?((${components.prefixes.join("|")})\\:[^\\s>]+)`),
        );
    }

    for (const regex of regexes) {
        const linkRange = doc.getWordRangeAtPosition(pos, regex);

        if (!linkRange) {
            continue;
        }

        const match = doc
            .getText(linkRange)
            .replace("<", "")
            .replace("/", "")
            .replace("x-", "");

        const component = components.components[match];

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
                    prop.hasDefault
                        ? ` = ${defaultToString(prop.default)}`
                        : "",
                ].join(""),
            ),
        );

        return new vscode.Hover(new vscode.MarkdownString(lines.join("\n\n")));
    }

    return null;
};
