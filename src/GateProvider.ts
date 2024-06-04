"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, Provider, Tags } from ".";
import { runInLaravel, template } from "./PHP";
import Helpers from "./helpers";
import { config } from "./support/config";
import { wordMatchRegex } from "./support/patterns";

export default class GateProvider implements Provider {
    private abilities: any[] = [];
    private models: any[] = [];

    constructor() {
        if (config<boolean>("disableAuth", false)) {
            return;
        }

        this.load();
    }

    tags(): Tags {
        return {
            classes: ["Gate"],
            functions: ["can", "@can", "@cannot", "@canany"],
        };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (func.param.index === 1) {
            return this.models.map((model) => {
                let completeItem = new vscode.CompletionItem(
                    model.replace(/\\/, "\\\\"),
                    vscode.CompletionItemKind.Value,
                );

                completeItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completeItem;
            });
        }

        return this.abilities.map((ability) => {
            let completeItem = new vscode.CompletionItem(
                ability,
                vscode.CompletionItemKind.Value,
            );
            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completeItem;
        });
    }

    load() {
        // TODO: huh?
        Helpers.getModels().then((models) => (this.models = models));

        runInLaravel<any[]>(template("auth"), "Auth Data")
            .then((result) => {
                this.abilities = result;
            })
            .catch((exception) => {
                console.error(exception);
            });
    }
}
