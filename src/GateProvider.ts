"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, Provider, Tags } from ".";
import { runInLaravel, template } from "./PHP";
import getModels from "./repositories/ModelRepository";
import { config } from "./support/config";
import { wordMatchRegex } from "./support/patterns";

export default class GateProvider implements Provider {
    private abilities: any[] = [];

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
            return getModels().map((model) => {
                let completeItem = new vscode.CompletionItem(
                    model.fqn.replace(/\\/g, "\\\\"),
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
        runInLaravel<any[]>(template("auth"), "Auth Data")
            .then((result) => {
                this.abilities = result;
            })
            .catch((exception) => {
                console.error(exception);
            });
    }
}
