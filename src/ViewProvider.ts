"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";
import { runInLaravel } from "./PHP";
import { createFileWatcher } from "./fileWatcher";

export default class ViewProvider implements vscode.CompletionItemProvider {
    private views: { [key: string]: string } = {};

    constructor() {
        this.load();

        createFileWatcher("{,**/}{view,views}/{*,**/*}", this.load.bind(this), [
            "create",
            "delete",
        ]);
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        var out: vscode.CompletionItem[] = [];
        var func = Helpers.parseDocumentFunction(document, position);

        if (func === null) {
            return out;
        }

        if (
            func &&
            ((func.class &&
                Helpers.tags.view.classes.some((cls: string) =>
                    func.class.includes(cls),
                )) ||
                Helpers.tags.view.functions.some((fn: string) =>
                    func.function.includes(fn),
                ))
        ) {
            if (func.paramIndex === 0 || func.paramIndex === null) {
                for (let i in this.views) {
                    var compeleteItem = new vscode.CompletionItem(
                        i,
                        vscode.CompletionItemKind.Constant,
                    );
                    compeleteItem.range = document.getWordRangeAtPosition(
                        position,
                        Helpers.wordMatchRegex,
                    );
                    out.push(compeleteItem);
                }
            } else if (typeof this.views[func.parameters[0]] !== "undefined") {
                var viewContent = fs.readFileSync(
                    this.views[func.parameters[0]],
                    "utf8",
                );
                var variableRegex = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
                var r: any = [];
                var variableNames = [];
                while ((r = variableRegex.exec(viewContent))) {
                    variableNames.push(r[1]);
                }
                variableNames = variableNames.filter(
                    (v, i, a) => a.indexOf(v) === i,
                );
                for (let i in variableNames) {
                    var variableCompeleteItem = new vscode.CompletionItem(
                        variableNames[i],
                        vscode.CompletionItemKind.Constant,
                    );
                    variableCompeleteItem.range =
                        document.getWordRangeAtPosition(
                            position,
                            Helpers.wordMatchRegex,
                        );
                    out.push(variableCompeleteItem);
                }
            }
        } else if (
            func &&
            (func.function === "@section" || func.function === "@push")
        ) {
            out = this.getYields(func.function, document.getText());
        }
        return out;
    }

    getYields(func: string, documentText: string): vscode.CompletionItem[] {
        var out: vscode.CompletionItem[] = [];
        var extendsRegex = /@extends\s*\([\'\"](.+)[\'\"]\)/g;
        var regexResult: any = [];
        if ((regexResult = extendsRegex.exec(documentText))) {
            if (typeof this.views[regexResult[1]] !== "undefined") {
                var parentContent = fs.readFileSync(
                    this.views[regexResult[1]],
                    "utf8",
                );
                var yieldRegex =
                    /@yield\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g;
                if (func === "@push") {
                    yieldRegex =
                        /@stack\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g;
                }
                var yeildNames = [];
                while ((regexResult = yieldRegex.exec(parentContent))) {
                    yeildNames.push(regexResult[1]);
                }
                yeildNames = yeildNames.filter((v, i, a) => a.indexOf(v) === i);
                for (var i in yeildNames) {
                    var yieldCompeleteItem = new vscode.CompletionItem(
                        yeildNames[i],
                        vscode.CompletionItemKind.Constant,
                    );
                    out.push(yieldCompeleteItem);
                }
                out = out.concat(this.getYields(func, parentContent));
            }
        }
        return out;
    }

    load() {
        try {
            runInLaravel(`
            echo json_encode([
                'paths' => app('view')->getFinder()->getPaths(),
                'hints' => app('view')->getFinder()->getHints(),
            ]);
            `).then((results) => {
                if (!results) {
                    return;
                }

                const allPaths = JSON.parse(results);

                const viewPaths = allPaths.paths
                    .map((path: string) =>
                        path.replace(
                            Helpers.projectPath("/", true),
                            Helpers.projectPath("/"),
                        ),
                    )
                    .forEach((path: string) => {
                        this.views = Object.assign(
                            this.views,
                            this.getViews(path),
                        );
                    });

                const viewNamespaces = allPaths.hints;

                for (let i in viewNamespaces) {
                    viewNamespaces[i] = viewNamespaces[i].map(
                        (path: string) => {
                            return path.replace(
                                Helpers.projectPath("/", true),
                                Helpers.projectPath("/"),
                            );
                        },
                    );
                }

                for (let i in viewNamespaces) {
                    for (var j in viewNamespaces[i]) {
                        var viewsInNamespace = this.getViews(
                            viewNamespaces[i][j],
                        );
                        for (var k in viewsInNamespace) {
                            this.views[`${i}::${k}`] = viewNamespaces[k];
                        }
                    }
                }
            });
        } catch (exception) {
            console.error(exception);
        }
    }

    getViews(path: string): { [key: string]: string } {
        if (path.substr(-1) !== "/" && path.substr(-1) !== "\\") {
            path += "/";
        }
        var out: { [key: string]: string } = {};
        var self = this;
        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
            fs.readdirSync(path).forEach(function (file) {
                if (fs.lstatSync(path + file).isDirectory()) {
                    var viewsInDirectory = self.getViews(path + file + "/");
                    for (var i in viewsInDirectory) {
                        out[
                            file +
                                vscode.workspace
                                    .getConfiguration("Laravel")
                                    .get<string>("viewDirectorySeparator") +
                                i
                        ] = viewsInDirectory[i];
                    }
                } else {
                    if (file.includes("blade.php")) {
                        out[file.replace(".blade.php", "")] = path + file;
                    }
                }
            });
        }
        return out;
    }
}
