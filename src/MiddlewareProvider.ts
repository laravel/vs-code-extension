"use strict";

import * as vscode from "vscode";
import Helpers from "./helpers";
import { runInLaravel, template } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import { CompletionItemFunction, Provider, Tags } from ".";

export default class MiddlewareProvider implements Provider {
    private middlewares: any[] = [];

    constructor() {
        this.load();

        createFileWatcher("app/Http/Kernel.php", this.load.bind(this), [
            "change",
        ]);
    }

    tags(): Tags {
        return { classes: [], functions: ["middleware"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return this.middlewares.map((middleware, i) => {
            let completionItem = new vscode.CompletionItem(
                i.toString(),
                vscode.CompletionItemKind.Enum,
            );

            completionItem.detail = middleware;

            completionItem.range = document.getWordRangeAtPosition(
                position,
                Helpers.wordMatchRegex,
            );

            return completionItem;
        });
    }

    load() {
        if (
            vscode.workspace.workspaceFolders instanceof Array &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            runInLaravel(template("middleware"), "Middlewares")
                .then((result) => {
                    if (result) {
                        this.middlewares = JSON.parse(result);
                    }
                })
                .catch((exception) => {
                    console.error(exception);
                });
        }
    }
}
