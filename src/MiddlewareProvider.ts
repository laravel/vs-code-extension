"use strict";

import * as vscode from "vscode";
import Helpers from "./helpers";
import { runInLaravel, template } from "./PHP";
import { createFileWatcher } from "./fileWatcher";

export default class MiddlewareProvider
    implements vscode.CompletionItemProvider
{
    private middlewares: Array<any> = [];

    constructor() {
        this.loadMiddlewares();

        createFileWatcher(
            "app/Http/Kernel.php",
            this.loadMiddlewares.bind(this),
            ["change"],
        );
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): Array<vscode.CompletionItem> {
        var out: Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        if (func === null) {
            return out;
        }

        if (func.function.includes("middleware")) {
            for (let i in this.middlewares) {
                var compeleteItem = new vscode.CompletionItem(
                    i,
                    vscode.CompletionItemKind.Enum,
                );
                compeleteItem.detail = this.middlewares[i];
                compeleteItem.range = document.getWordRangeAtPosition(
                    position,
                    Helpers.wordMatchRegex,
                );
                out.push(compeleteItem);
            }
        }
        return out;
    }

    loadMiddlewares() {
        if (
            vscode.workspace.workspaceFolders instanceof Array &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            runInLaravel(template("middleware"), "Middlewares")
                .then((result) => {
                    this.middlewares = JSON.parse(result);
                })
                .catch((exception) => {
                    console.error(exception);
                });
        }
    }
}
