"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";
import { createFileWatcher } from "./fileWatcher";

export default class EnvProvider implements vscode.CompletionItemProvider {
    private enviroments: { [key: string]: string } = {};

    constructor() {
        this.load();

        createFileWatcher(".env", this.load.bind(this));
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        let out: vscode.CompletionItem[] = [];
        let func = Helpers.parseDocumentFunction(document, position);

        if (func === null) {
            return out;
        }

        if (
            func &&
            Helpers.tags.env.functions.some((fn: string) =>
                func.function.includes(fn),
            )
        ) {
            for (let i in this.enviroments) {
                let completeItem = new vscode.CompletionItem(
                    i,
                    vscode.CompletionItemKind.Constant,
                );
                completeItem.range = document.getWordRangeAtPosition(
                    position,
                    Helpers.wordMatchRegex,
                );
                completeItem.detail = this.enviroments[i];
                out.push(completeItem);
            }
        }
        return out;
    }

    load() {
        try {
            if (!fs.existsSync(Helpers.projectPath(".env"))) {
                return;
            }

            let enviroments: any = {};

            let envs = fs
                .readFileSync(Helpers.projectPath(".env"), "utf8")
                .split("\n");

            for (let i in envs) {
                let envKeyValue = envs[i].split("=");

                if (envKeyValue.length === 2) {
                    enviroments[envKeyValue[0]] = envKeyValue[1];
                }
            }
            this.enviroments = enviroments;
        } catch (exception) {
            console.error(exception);
        }
    }
}
