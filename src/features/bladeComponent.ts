import {
    getBladeComponents,
    patterns,
} from "@src/repositories/bladeComponents";
import { Cache } from "@src/support/cache";
import { config } from "@src/support/config";
import { projectPath, relativePath } from "@src/support/project";
import { globToRegex } from "@src/support/util";
import fs from "fs/promises";
import os from "os";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider, RenameFilesProvider } from "..";

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

        const markdown = new vscode.MarkdownString();

        component.paths.map((path) =>
            markdown.appendMarkdown(
                `[${path}](${vscode.Uri.file(projectPath(path))})\n\n`,
            ),
        );

        if (typeof component.props === "string") {
            markdown.appendCodeblock(component.props, "blade");
        } else {
            component.props.map((prop) =>
                markdown.appendMarkdown(
                    [
                        "`" + prop.type + "` ",
                        "`" + prop.name + "`",
                        prop.default ? ` = ${prop.default}` : "",
                        os.EOL.repeat(2),
                    ].join(""),
                ),
            );
        }

        return new vscode.Hover(markdown);
    }

    return null;
};

const keys = new Cache<string, string>(100);

export const renameFilesProvider: RenameFilesProvider = {
    customCheck(event: vscode.FileWillRenameEvent | vscode.FileRenameEvent) {
        return event.files.filter((file) => {
            const path = vscode.workspace.asRelativePath(file.oldUri);

            return Object.values(patterns).some((pattern) =>
                globToRegex(pattern).test(path),
            );
        });
    },

    beforeRenameFiles(files: vscode.FileWillRenameEvent["files"]) {
        getBladeComponents().whenLoaded((components) => {
            files.forEach((file) => {
                const oldPath = relativePath(file.oldUri.fsPath);

                const oldKey = Object.entries(components.components).find(
                    ([_, component]) =>
                        component.paths.some((p) => p.startsWith(oldPath)),
                )?.[0];

                if (!oldKey) {
                    return;
                }

                keys.set(oldPath, oldKey);
            });
        });
    },

    afterRenameFiles(files: vscode.FileRenameEvent["files"]) {
        getBladeComponents().whenReloaded(async (components) => {
            const pLimit = (await import("p-limit")).default;

            files.forEach((file) => {
                const oldPath = relativePath(file.oldUri.fsPath);

                const oldKey = keys.get(oldPath);

                keys.delete(oldPath);

                if (!oldKey) {
                    return;
                }

                const newPath = relativePath(file.newUri.fsPath);

                const newKey = Object.entries(components.components).find(
                    ([_, component]) =>
                        component.paths.some((p) => p.startsWith(newPath)),
                )?.[0];

                if (!newKey || newKey === oldKey) {
                    return;
                }

                if (!newPath.endsWith(".blade.php")) {
                    const [oldBladePath, newBladePath] = [oldKey, newKey].map(
                        (key) =>
                            vscode.Uri.file(
                                projectPath(
                                    `resources/views/components/${key.replaceAll(".", "/")}.blade.php`,
                                ),
                            ),
                    );

                    vscode.workspace.fs.rename(oldBladePath, newBladePath);

                    fs.readFile(file.newUri.fsPath, "utf-8").then((text) => {
                        const updated = text.replace(
                            new RegExp(
                                `(?<=\\b(?:view|View::make)\\(('|")components\\.)${oldKey.replaceAll(".", "\\.")}(?=\\1\\))`,
                                "g",
                            ),
                            newKey,
                        );

                        fs.writeFile(file.newUri.fsPath, updated, "utf-8");
                    });
                }

                keys.set(oldKey, newKey);
            });

            if (keys.size() === 0) {
                return;
            }

            const componentFiles = await vscode.workspace.findFiles(
                patterns.bladeFiles,
            );

            const pattern = new RegExp(
                `(<\\/?x-)(${Array.from(keys.all().keys()).join("|")})(?=\\s|>|\\/>)`,
                "g",
            );

            const limit = pLimit(10);

            const promises = componentFiles.map((file) =>
                limit(async () => {
                    const filePath = file.fsPath;

                    const text = await fs.readFile(filePath, "utf-8");

                    const updated = text.replace(
                        pattern,
                        (_, prefix, oldKey) => `${prefix}${keys.get(oldKey)}`,
                    );

                    if (updated === text) {
                        return;
                    }

                    await fs.writeFile(filePath, updated, "utf-8");
                }),
            );

            await Promise.all(promises);

            keys.clear();
        });
    },
};
