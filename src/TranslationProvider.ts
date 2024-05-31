"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";
import { runInLaravel } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import { CompletionItemFunction, Provider, Tags } from ".";

export default class TranslationProvider implements Provider {
    private translations: any[] = [];

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
        var out: vscode.CompletionItem[] = [];

        if (func.paramIndex === 1) {
            // parameters autocomplete
            var paramRegex = /\:([A-Za-z0-9_]+)/g;
            var match = null;

            for (let i in this.translations) {
                if (this.translations[i].name === func.parameters[0]) {
                    while (
                        (match = paramRegex.exec(
                            this.translations[i].value,
                        )) !== null
                    ) {
                        var completionItem = new vscode.CompletionItem(
                            match[1],
                            vscode.CompletionItemKind.Variable,
                        );
                        completionItem.range = document.getWordRangeAtPosition(
                            position,
                            Helpers.wordMatchRegex,
                        );
                        out.push(completionItem);
                    }
                    return out;
                }
            }

            return out;
        }

        for (let i in this.translations) {
            var completeItem = new vscode.CompletionItem(
                this.translations[i].name,
                vscode.CompletionItemKind.Value,
            );
            completeItem.range = document.getWordRangeAtPosition(
                position,
                Helpers.wordMatchRegex,
            );
            if (this.translations[i].value) {
                completeItem.detail = this.translations[i].value.toString();
            }
            out.push(completeItem);
        }

        return out;
    }

    load() {
        var translations: any[] = [];
        try {
            var self = this;
            runInLaravel(
                "echo json_encode(app('translator')->getLoader()->namespaces());",
                "Translation namespaces",
            ).then(async function (res) {
                if (!res) {
                    return;
                }

                var tranlationNamespaces = JSON.parse(res);
                for (let i in tranlationNamespaces) {
                    tranlationNamespaces[i + "::"] = tranlationNamespaces[i];
                    delete tranlationNamespaces[i];
                }
                const result = await runInLaravel(
                    "echo json_encode(app()->langPath());",
                    "Translation Path",
                );

                if (!result) {
                    return;
                }

                let langPath = JSON.parse(result);
                tranlationNamespaces[""] = langPath;
                var nestedTranslationGroups = function (
                    basePath: string,
                    relativePath: string = "",
                ): Array<string> {
                    let path = basePath + "/" + relativePath;
                    let out: Array<string> = [];
                    if (
                        fs.existsSync(path) &&
                        fs.lstatSync(path).isDirectory()
                    ) {
                        fs.readdirSync(path).forEach(function (file) {
                            if (fs.lstatSync(path + "/" + file).isFile()) {
                                out.push(
                                    relativePath +
                                        "/" +
                                        file.replace(/\.php/, ""),
                                );
                            } else if (
                                fs.lstatSync(path + "/" + file).isDirectory()
                            ) {
                                let nestedOut = nestedTranslationGroups(
                                    basePath,
                                    (relativePath.length > 0
                                        ? relativePath + "/"
                                        : "") + file,
                                );
                                for (let nested of nestedOut) {
                                    out.push(nested);
                                }
                            }
                        });
                    }
                    return out;
                };
                var translationGroups: any = [];
                fs.readdirSync(langPath).forEach(function (langDir) {
                    var path: any = langPath + "/" + langDir;
                    if (
                        fs.existsSync(path) &&
                        fs.lstatSync(path).isDirectory()
                    ) {
                        fs.readdirSync(path).forEach(function (subDirectory) {
                            let subDirectoryPath = path + "/" + subDirectory;
                            if (
                                fs.existsSync(subDirectoryPath) &&
                                fs.lstatSync(subDirectoryPath).isDirectory()
                            ) {
                                let nestedDirectories = nestedTranslationGroups(
                                    path,
                                    subDirectory,
                                );
                                for (let nestedDirectory of nestedDirectories) {
                                    translationGroups.push(nestedDirectory);
                                }
                            }
                        });
                    }
                });
                for (let i in tranlationNamespaces) {
                    if (
                        fs.existsSync(tranlationNamespaces[i]) &&
                        fs.lstatSync(tranlationNamespaces[i]).isDirectory()
                    ) {
                        fs.readdirSync(tranlationNamespaces[i]).forEach(
                            function (langDir) {
                                var path: any =
                                    tranlationNamespaces[i] + "/" + langDir;
                                if (
                                    fs.existsSync(path) &&
                                    fs.lstatSync(path).isDirectory()
                                ) {
                                    fs.readdirSync(path).forEach(function (
                                        file,
                                    ) {
                                        if (
                                            fs
                                                .lstatSync(path + "/" + file)
                                                .isFile()
                                        ) {
                                            translationGroups.push(
                                                i + file.replace(/\.php/, ""),
                                            );
                                        }
                                    });
                                }
                            },
                        );
                    }
                }
                translationGroups = translationGroups.filter(function (
                    item: any,
                    index: any,
                    array: any,
                ) {
                    return array.indexOf(item) === index;
                });
                runInLaravel(
                    "echo json_encode([" +
                        translationGroups
                            .map(
                                (transGroup: string) =>
                                    "'" +
                                    transGroup +
                                    "' => __('" +
                                    transGroup +
                                    "')",
                            )
                            .join(",") +
                        "]);",
                    "Translations inside namespaces",
                ).then(function (translationGroupsResult) {
                    if (!translationGroupsResult) {
                        return;
                    }

                    translationGroups = JSON.parse(translationGroupsResult);
                    for (var i in translationGroups) {
                        translations = translations.concat(
                            self.getTranslations(translationGroups[i], i),
                        );
                    }
                    self.translations = translations;
                    runInLaravel(
                        "echo json_encode(__('*'));",
                        "Default path Translations",
                    ).then(function (jsontransResult) {
                        if (!jsontransResult) {
                            return;
                        }

                        translations = translations.concat(
                            self
                                .getTranslations(
                                    JSON.parse(jsontransResult),
                                    "",
                                )
                                .map(function (transInfo) {
                                    transInfo.name = transInfo.name.replace(
                                        /^\./,
                                        "",
                                    );
                                    return transInfo;
                                }),
                        );
                        self.translations = translations;
                    });
                });
            });
        } catch (exception) {
            console.error(exception);
        }
    }

    getTranslations(translations: any[], prefix: string): any[] {
        var out: any[] = [];
        for (var i in translations) {
            if (translations[i] instanceof Object) {
                out.push({ name: prefix + "." + i, value: "array(...)" });
                out = out.concat(
                    this.getTranslations(translations[i], prefix + "." + i),
                );
            } else {
                out.push({ name: prefix + "." + i, value: translations[i] });
            }
        }
        return out;
    }
}
