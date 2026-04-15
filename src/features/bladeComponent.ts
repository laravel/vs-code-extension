import {
    getBladeComponents,
    patterns,
} from "@src/repositories/bladeComponents";
import { Cache } from "@src/support/cache";
import { config } from "@src/support/config";
import { projectPath } from "@src/support/project";
import { kebab } from "@src/support/str";
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

const getKey = (path: string): string => {
    const key = path
        .replace(/^app\/View(\/Components)?/, "")
        .replace("resources/views/components/", "")
        .replace(/(\.[^/.]+)+$/, "")
        .replace(/^\/+/, "")
        .replaceAll("/", ".");

    return kebab(key);
};

const getUri = (key: string): vscode.Uri =>
    vscode.Uri.file(
        projectPath(
            `resources/views/components/${key.replaceAll(".", "/")}.blade.php`,
        ),
    );

export const renameFilesProvider: RenameFilesProvider = {
    customCheck(event: vscode.FileWillRenameEvent | vscode.FileRenameEvent) {
        const components = getBladeComponents().items.components;

        return event.files.filter((file) => {
            // asRelativePath returns paths with forward slashes on all platforms
            const path = vscode.workspace.asRelativePath(file.oldUri);
            const key = getKey(path);

            return (
                Object.values(patterns).some((pattern) =>
                    globToRegex(pattern).test(path),
                ) && components[key]
            );
        });
    },

    async provideRenameFiles(files: vscode.FileWillRenameEvent["files"]) {
        const pLimit = (await import("p-limit")).default;
        const limit = pLimit(10);

        const keys: Cache<string, string> = new Cache(100);

        const filePromise = files.map((file) =>
            limit(async () => {
                const oldPath = vscode.workspace.asRelativePath(
                    file.oldUri.fsPath,
                );
                const oldKey = getKey(oldPath);

                const newPath = vscode.workspace.asRelativePath(file.newUri);
                const newKey = getKey(newPath);

                if (newKey === oldKey) {
                    return;
                }

                keys.set(oldKey, newKey);

                if (newPath.endsWith(".blade.php")) {
                    return;
                }

                const oldBladePath = getUri(oldKey);
                const newBladePath = getUri(newKey);

                vscode.workspace.fs.rename(oldBladePath, newBladePath);

                // Case when a component class namespace is changed by Intelephense or other extension.
                // We can't use fs.readFile/fs.writeFile because Intelephense overwrites content file after our change
                const doc = await vscode.workspace.openTextDocument(
                    file.newUri,
                );
                const text = doc.getText();

                const regex = new RegExp(
                    `(?<=\\b(?:view|View::make)\\((['"])components\\.)${oldKey.replaceAll(".", "\\.")}(?=\\1\\))`,
                    "g",
                );

                const updated = text.replace(regex, newKey);

                if (updated === text) {
                    return;
                }

                const edit = new vscode.WorkspaceEdit();

                edit.replace(
                    file.newUri,
                    new vscode.Range(0, 0, doc.lineCount, 0),
                    updated,
                );

                await vscode.workspace.applyEdit(edit);
            }),
        );

        await Promise.all(filePromise);

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

        const componentPromise = componentFiles.map((file) =>
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

        await Promise.all(componentPromise);
    },
};
