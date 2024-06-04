"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, Provider, Tags } from "..";
import { createFileWatcher } from "./../support/fileWatcher";
import { wordMatchRegex } from "./../support/patterns";
import { projectPathExists, readFileInProject } from "./../support/project";

export default class Env implements Provider {
    private enviroments: { [key: string]: string } = {};

    constructor() {
        this.load();

        createFileWatcher(".env", this.load.bind(this));
    }

    tags(): Tags {
        return { classes: [], functions: ["env"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return Object.entries(this.enviroments).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Constant,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            completeItem.detail = value;

            return completeItem;
        });
    }

    load() {
        try {
            if (!projectPathExists(".env")) {
                return;
            }

            readFileInProject(".env")
                .split("\n")
                .map((env) => env.trim())
                .filter((env) => !env.startsWith("#"))
                .map((env) => env.split("=").map((env) => env.trim()))
                .filter((env) => env.length === 2)
                .forEach(([key, value]) => {
                    this.enviroments[key] = value;
                });
        } catch (exception) {
            console.error(exception);
        }
    }
}
