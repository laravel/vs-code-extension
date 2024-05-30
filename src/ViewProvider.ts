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
        var func = Helpers.parseDocumentFunction(document, position);

        if (func === null) {
            return [];
        }

        if (
            (func.class &&
                Helpers.tags.view.classes.some((cls: string) =>
                    func.class.includes(cls),
                )) ||
            Helpers.tags.view.functions.some((fn: string) =>
                func.function.includes(fn),
            )
        ) {
            let out: vscode.CompletionItem[] = [];

            if (func.paramIndex === 0 || func.paramIndex === null) {
                for (let i in this.views) {
                    let completionItem = new vscode.CompletionItem(
                        i,
                        vscode.CompletionItemKind.Constant,
                    );

                    completionItem.range = document.getWordRangeAtPosition(
                        position,
                        Helpers.wordMatchRegex,
                    );
                    out.push(completionItem);
                }

                return out;
            }

            if (typeof this.views[func.parameters[0]] === "undefined") {
                return [];
            }

            let viewContent = fs.readFileSync(
                this.views[func.parameters[0]],
                "utf8",
            );

            let variableRegex = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
            let r: RegExpExecArray | null = null;
            let variableNames = new Set<string>([]);

            while ((r = variableRegex.exec(viewContent))) {
                variableNames.add(r[1]);
            }

            return [...variableNames].map((variableName) => {
                let variableCompeleteItem = new vscode.CompletionItem(
                    variableName,
                    vscode.CompletionItemKind.Constant,
                );
                variableCompeleteItem.range = document.getWordRangeAtPosition(
                    position,
                    Helpers.wordMatchRegex,
                );
                return variableCompeleteItem;
            });
        }

        if (["@section", "@push"].includes(func.function)) {
            return this.getYields(func.function, document.getText());
        }

        return [];
    }

    getYields(func: string, documentText: string): vscode.CompletionItem[] {
        let extendsRegex = /@extends\s*\([\'\"](.+)[\'\"]\)/g;
        let regexResult = extendsRegex.exec(documentText);

        if (!regexResult) {
            return [];
        }

        if (typeof this.views[regexResult[1]] === "undefined") {
            return [];
        }

        let parentContent = fs.readFileSync(this.views[regexResult[1]], "utf8");
        let yieldRegex =
            func === "@push"
                ? /@stack\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g
                : /@yield\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g;

        let yieldNames = new Set<string>([]);

        while ((regexResult = yieldRegex.exec(parentContent))) {
            yieldNames.add(regexResult[1]);
        }

        return [...yieldNames]
            .map(
                (yieldName) =>
                    new vscode.CompletionItem(
                        yieldName,
                        vscode.CompletionItemKind.Constant,
                    ),
            )
            .concat(this.getYields(func, parentContent));
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
        if (path.substring(-1) !== "/" && path.substring(-1) !== "\\") {
            path += "/";
        }

        if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
            return {};
        }

        const directorySeparator = vscode.workspace
            .getConfiguration("Laravel")
            .get<string>("viewDirectorySeparator");

        return fs
            .readdirSync(path)
            .reduce((obj: { [key: string]: string }, file) => {
                if (fs.lstatSync(path + file).isDirectory()) {
                    let viewsInDirectory = this.getViews(path + file + "/");

                    for (let i in viewsInDirectory) {
                        obj[file + directorySeparator + i] =
                            viewsInDirectory[i];
                    }

                    return obj;
                }

                if (file.includes("blade.php")) {
                    obj[file.replace(".blade.php", "")] = path + file;
                }

                return obj;
            }, {});
    }
}
