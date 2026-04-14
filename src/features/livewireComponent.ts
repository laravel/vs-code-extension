import { getViews, patterns } from "@src/repositories/views";
import { Cache } from "@src/support/cache";
import { config } from "@src/support/config";
import { livewireHover } from "@src/support/markdown";
import { projectPath } from "@src/support/project";
import { kebab } from "@src/support/str";
import { globToRegex } from "@src/support/util";
import fs from "fs/promises";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider, RenameFilesProvider } from "..";

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    const links: vscode.DocumentLink[] = [];
    const text = doc.getText();
    const lines = text.split("\n");
    const views = getViews().items.views;

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

    const views = getViews().items.views;

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
            .items.views.filter((view) => view.livewire)
            .map(
                (view) =>
                    new vscode.CompletionItem(view.key.replace(pathPrefix, "")),
            );
    },
};

const getKey = (newPath: string): string => {
    const livewirePaths = getViews().items.livewirePaths;

    const key = newPath
        .replaceAll("⚡", "")
        .replace(/^app\/Livewire(\/Components)?/, "")
        .replace(new RegExp(`^(${livewirePaths.join("|")})`), "")
        .replace(/(\.[^/.]+)+$/, "")
        .replace(/^\/+/, "")
        .replaceAll("/", ".");

    return kebab(key);
};

const getUri = (key: string): vscode.Uri =>
    vscode.Uri.file(
        projectPath(
            `resources/views/livewire/${key.replaceAll(".", "/")}.blade.php`,
        ),
    );

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

    async provideRenameFiles(files: vscode.FileRenameEvent["files"]) {
        const pLimit = (await import("p-limit")).default;
        const limit = pLimit(10);

        const keys: Cache<string, string> = new Cache(100);
        const components = getViews().items.views;

        const filePromise = files.map((file) =>
            limit(async () => {
                const oldPath = vscode.workspace.asRelativePath(
                    file.oldUri.fsPath,
                );
                const oldKey = getKey(oldPath);

                const component = components.find(
                    (component) =>
                        component.livewire && component.key === oldKey,
                );

                if (!component) {
                    return;
                }

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
                    `(?<=\\b(?:view|View::make)\\(('|")livewire\\.)${oldKey.replaceAll(".", "\\.")}(?=\\1\\))`,
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
            `(<\\/?livewire:)(${Array.from(keys.all().keys()).join("|")})(?=\\s|>|\\/>)`,
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
