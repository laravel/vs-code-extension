import { getViews, patterns } from "@src/repositories/views";
import { Cache } from "@src/support/cache";
import { config } from "@src/support/config";
import { livewireHover } from "@src/support/markdown";
import { projectPath, relativePath } from "@src/support/project";
import { kebab } from "@src/support/str";
import { globToRegex } from "@src/support/util";
import { get } from "axios";
import fs from "fs/promises";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider, RenameFilesProvider } from "..";

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

    const view = views.find((v) => {
        return v.key === `livewire.${match}` || (v.livewire && v.key === match);
    });

    if (!view?.livewire) {
        return null;
    }

    return livewireHover(view.livewire);
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

const keys = new Cache<string, string>(100);

/**
 * We don't have the Livewire components repository, just Blade view files repository,
 * so we cannot know the new key for the class if the blade file is not renamed together with the class file.
 *
 * This function is a fallback when the Livewire class file is renamed without renaming the blade file
 */
const getNewKeyForClass = (newPath: string): string | undefined => {
    if (!newPath.endsWith(".php")) {
        return undefined;
    }

    const key = newPath
        .replace(/^app\/Livewire(\/Components)?/, "")
        .replace(/(\.[^/.]+)+$/, "")
        .replace(/^\/+/, "")
        .replaceAll("/", ".");

    return kebab(key);
};

export const renameFilesProvider: RenameFilesProvider = {
    customCheck(event: vscode.FileWillRenameEvent | vscode.FileRenameEvent) {
        return event.files.filter((file) => {
            // asRelativePath returns paths with forward slashes on all platforms
            const path = vscode.workspace.asRelativePath(file.oldUri);

            return Object.values(patterns).some((pattern) =>
                globToRegex(pattern).test(path),
            );
        });
    },

    beforeRenameFiles(files: vscode.FileWillRenameEvent["files"]) {
        getViews().whenLoaded((views) => {
            files.forEach((file) => {
                const oldPath = relativePath(file.oldUri.fsPath);

                const oldKey = views.find((component) =>
                    component.livewire?.files.some((p) =>
                        p.startsWith(oldPath),
                    ),
                )?.key;

                if (!oldKey) {
                    return;
                }

                keys.set(oldPath, oldKey);
            });
        });
    },

    afterRenameFiles(files: vscode.FileRenameEvent["files"]) {
        getViews().whenReloaded(async (views) => {
            const pLimit = (await import("p-limit")).default;

            files.forEach((file) => {
                const oldPath = relativePath(file.oldUri.fsPath);

                const oldKey = keys.get(oldPath);

                keys.delete(oldPath);

                if (!oldKey) {
                    return;
                }

                const newPath = relativePath(file.newUri.fsPath);

                const newKey =
                    views.find((component) =>
                        component.livewire?.files.some((p) =>
                            p.startsWith(newPath),
                        ),
                    )?.key ?? getNewKeyForClass(newPath);

                if (!newKey || newKey === oldKey) {
                    return;
                }

                if (!newPath.endsWith(".blade.php")) {
                    const [oldBladePath, newBladePath] = [oldKey, newKey].map(
                        (key) =>
                            vscode.Uri.file(
                                projectPath(
                                    `resources/views/livewire/${key.replaceAll(".", "/")}.blade.php`,
                                ),
                            ),
                    );

                    vscode.workspace.fs.rename(oldBladePath, newBladePath);

                    fs.readFile(file.newUri.fsPath, "utf-8").then((text) => {
                        const updated = text.replace(
                            new RegExp(
                                `(?<=\\b(?:view|View::make)\\(('|")livewire\\.)${oldKey.replaceAll(".", "\\.")}(?=\\1\\))`,
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
                `(<\\/?livewire:)(${Array.from(keys.all().keys()).join("|")})(?=\\s|>|\\/>)`,
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
