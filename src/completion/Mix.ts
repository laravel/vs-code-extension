"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, Provider, Tags } from "..";
import { wordMatchRegex } from "./../support/patterns";
import { projectPathExists, readFileInProject } from "./../support/project";

export default class Mix implements Provider {
    private mixes: any[] = [];

    constructor() {
        this.load();
        // TODO: wat
        // setInterval(() => this.load(), 60000);
    }

    tags(): Tags {
        return { classes: [], functions: ["mix"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return this.mixes.map((mix) => {
            let completeItem = new vscode.CompletionItem(
                mix,
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
        try {
            const path = "public/mix-manifest.json";

            if (!projectPathExists(path)) {
                return;
            }

            let mixes = readFileInProject(path);

            this.mixes = Object.keys(mixes).map((mixFile) =>
                mixFile.replace(/^\//g, ""),
            );
        } catch (exception) {
            console.error(exception);
        }
    }
}
