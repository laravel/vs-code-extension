"use strict";

import * as vscode from "vscode";
import Helpers from "./helpers";
import { runInLaravel, template } from "./PHP";

export default class AuthProvider implements vscode.CompletionItemProvider {
    private abilities: Array<any> = [];
    private models: Array<any> = [];

    constructor() {
        if (
            vscode.workspace
                .getConfiguration("Laravel")
                .get<boolean>("disableAuth", false)
        ) {
            return;
        }

        // TODO: huh?
        this.loadAbilities();

        // setInterval(() => this.loadAbilities(), 60000);
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

        if (
            func &&
            ((func.class &&
                Helpers.tags.auth.classes.some((cls: string) =>
                    func.class.includes(cls),
                )) ||
                Helpers.tags.auth.functions.some((fn: string) =>
                    func.function.includes(fn),
                ))
        ) {
            if (func.paramIndex === 1) {
                for (let i in this.models) {
                    let completeItem = new vscode.CompletionItem(
                        this.models[i].replace(/\\/, "\\\\"),
                        vscode.CompletionItemKind.Value,
                    );
                    completeItem.range = document.getWordRangeAtPosition(
                        position,
                        Helpers.wordMatchRegex,
                    );
                    out.push(completeItem);
                }
            } else {
                for (let i in this.abilities) {
                    let completeItem = new vscode.CompletionItem(
                        this.abilities[i],
                        vscode.CompletionItemKind.Value,
                    );
                    completeItem.range = document.getWordRangeAtPosition(
                        position,
                        Helpers.wordMatchRegex,
                    );
                    out.push(completeItem);
                }
            }
        }
        return out;
    }

    loadAbilities() {
        // TODO: huh?
        Helpers.getModels().then((models) => (this.models = models));

        runInLaravel(template("auth"), "Auth Data")
            .then((result) => {
                if (result) {
                    this.abilities = JSON.parse(result);
                }
            })
            .catch((exception) => {
                console.error(exception);
            });
    }
}
