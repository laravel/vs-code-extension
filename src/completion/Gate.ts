"use strict";

import * as vscode from "vscode";
import { CompletionProvider, ParsingResult, Tags } from "..";
import { getModels } from "./../repositories/models";
import { wordMatchRegex } from "./../support/patterns";
import { runInLaravel, template } from "./../support/php";

export default class Gate implements CompletionProvider {
    private abilities: any[] = [];

    constructor() {
        this.load();
    }

    tags(): Tags {
        return [
            {
                class: "Illuminate\\Support\\Facades\\Gate",
                functions: [
                    "has",
                    "allows",
                    "denies",
                    "check",
                    "any",
                    "none",
                    "authorize",
                    "inspect",
                ],
            },
            {
                functions: ["can", "@can", "@cannot", "@canany"],
            },
        ];
    }

    provideCompletionItems(
        result: ParsingResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (result.param.index === 1) {
            return getModels().items.map((model) => {
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
