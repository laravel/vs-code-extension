"use strict";

import * as fs from "fs";
import * as vscode from "vscode";
import { CompletionItemFunction, CompletionProvider, Tags } from "..";
import { createFileWatcher } from "./../support/fileWatcher";
import { wordMatchRegex } from "./../support/patterns";
import { runInLaravel } from "./../support/php";

type TranslationItem = { name: string; value: string };

export default class Translation implements CompletionProvider {
    private translations: TranslationItem[] = [];

    constructor() {
        this.load();

        createFileWatcher(
            "{,**/}{lang,localization,localizations,trans,translation,translations}/{*,**/*}",
            this.load.bind(this),
        );
    }

    tags(): Tags {
        return { classes: ["Lang"], functions: ["__", "trans", "@lang"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (func.param.index === 1) {
            if (!func.param.isKey) {
                return [];
            }

            // Parameters autocomplete
            return this.translations
                .filter(
                    (translation) => translation.name === func.parameters[0],
                )
                .map((translation) => {
                    let out: vscode.CompletionItem[] = [];
                    let match = null;
                    let paramRegex = /\:([A-Za-z0-9_]+)/g;

                    while (
                        (match = paramRegex.exec(translation.value)) !== null
                    ) {
                        if (func.param.keys.includes(match[1])) {
                            // We've already added this parameter, don't suggest it
                            continue;
                        }

                        let completionItem = new vscode.CompletionItem(
                            match[1],
                            vscode.CompletionItemKind.Variable,
                        );

                        completionItem.range = document.getWordRangeAtPosition(
                            position,
                            wordMatchRegex,
                        );

                        out.push(completionItem);
                    }

                    return out;
                })
                .flat();
        }

        return this.translations.map((translation) => {
            let completionItem = new vscode.CompletionItem(
                translation.name,
                vscode.CompletionItemKind.Value,
            );

            completionItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            completionItem.detail = translation.value;

            return completionItem;
        });
    }

    nestedTranslationGroups(
        basePath: string,
        relativePath: string = "",
    ): string[] {
        let path = `${basePath}/${relativePath}`;

        if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
            return [];
        }

        return fs
            .readdirSync(path)
            .map((file) => {
                const stat = fs.lstatSync(`${path}/${file}`);

                if (stat.isFile()) {
                    return relativePath + "/" + file.replace(/\.php/, "");
                }

                if (stat.isDirectory()) {
                    return this.nestedTranslationGroups(
                        basePath,
                        (relativePath.length > 0 ? `${relativePath}/` : "") +
                            file,
                    );
                }

                return "";
            })
            .flat()
            .filter((item) => item.length > 0);
    }

    load() {
        this.translations = [];

        try {
            runInLaravel<{
                namespaces: { [key: string]: string };
                path: string;
            }>(
                `echo json_encode([
                    'namespaces' => app('translator')->getLoader()->namespaces(),
                    'path' => app()->langPath(),
                ]);`,
                "Translation namespaces",
            ).then(async (result) => {
                let translationNamespaces = Object.entries(
                    result.namespaces,
                ).map(([key, value]) => [`${key}::`, value]);

                translationNamespaces.push(["", result.path]);

                let translationGroups = new Set<string>();

                fs.readdirSync(result.path)
                    .map((langDir) => `${result.path}/${langDir}`)
                    .filter(
                        (path) =>
                            fs.existsSync(path) &&
                            fs.lstatSync(path).isDirectory(),
                    )
                    .forEach((path) => {
                        fs.readdirSync(path)
                            .filter(
                                (subDirectory) =>
                                    fs.existsSync(`${path}/${subDirectory}`) &&
                                    fs
                                        .lstatSync(`${path}/${subDirectory}`)
                                        .isDirectory(),
                            )
                            .forEach((subDirectory) => {
                                this.nestedTranslationGroups(
                                    path,
                                    subDirectory,
                                ).forEach((nestedDirectory) => {
                                    translationGroups.add(nestedDirectory);
                                });
                            });
                    });

                translationNamespaces
                    .filter(
                        ([key, path]) =>
                            fs.existsSync(path) &&
                            fs.lstatSync(path).isDirectory(),
                    )
                    .forEach(([key, path]) => {
                        fs.readdirSync(path)
                            .map((langDir) => `${path}/${langDir}`)
                            .filter(
                                (langDir) =>
                                    fs.existsSync(langDir) &&
                                    fs.lstatSync(langDir).isDirectory(),
                            )
                            .forEach((langDir) => {
                                fs.readdirSync(langDir)
                                    .filter((file) =>
                                        fs
                                            .lstatSync(`${langDir}/${file}`)
                                            .isFile(),
                                    )
                                    .forEach((file) => {
                                        translationGroups.add(
                                            key + file.replace(/\.php/, ""),
                                        );
                                    });
                            });
                    });

                runInLaravel<{
                    [key: string]: any[];
                }>(
                    "echo json_encode([" +
                        [...translationGroups]
                            .map(
                                (transGroup: string) =>
                                    `'${transGroup}' => __('${transGroup}')`,
                            )
                            .join(",") +
                        "]);",
                    "Translations inside namespaces",
                ).then((translationGroupsResult) => {
                    Object.entries(translationGroupsResult).forEach(
                        ([key, value]) => {
                            this.getTranslations(value, key).forEach(
                                (transInfo) => {
                                    this.translations.push(transInfo);
                                },
                            );
                        },
                    );
                });
            });
        } catch (exception) {
            console.error(exception);
        }
    }

    getTranslations(
        translations: { [key: string]: any },
        prefix: string,
    ): TranslationItem[] {
        return Object.entries(translations)
            .map(([key, translation]) => {
                if (translation instanceof Object) {
                    return this.getTranslations(
                        translation,
                        `${prefix}.${key}`,
                    );
                }

                return { name: `${prefix}.${key}`, value: translation };
            })
            .flat();
    }
}
