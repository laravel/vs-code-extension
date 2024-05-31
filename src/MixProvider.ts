"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";

export default class MixProvider implements vscode.CompletionItemProvider {
    private mixes: Array<any> = [];

    constructor() {
        this.load();
        setInterval(() => this.load(), 60000);
    }

    static tags(): Tags {
        return { classes: [], functions: ["mix"] };
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        let func = Helpers.parseDocumentFunction(document, position);

        if (func === null) {
            return [];
        }

        if (
            !MixProvider.tags().functions.some((fn: string) =>
                func.function.includes(fn),
            )
        ) {
            return [];
        }

        return this.mixes.map((mix) => {
            let completeItem = new vscode.CompletionItem(
                mix,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                Helpers.wordMatchRegex,
            );

            return completeItem;
        });
    }

    load() {
        try {
            const path = Helpers.projectPath("public/mix-manifest.json");

            if (!fs.existsSync(path)) {
                return;
            }

            let mixes = JSON.parse(fs.readFileSync(path, "utf8"));

            this.mixes = Object.keys(mixes).map((mixFile) =>
                mixFile.replace(/^\//g, ""),
            );
        } catch (exception) {
            console.error(exception);
        }
    }
}
