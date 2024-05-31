"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";
import { createFileWatcher } from "./fileWatcher";
import { CompletionItemFunction, Provider, Tags } from ".";

export default class EnvProvider implements Provider {
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
                Helpers.wordMatchRegex,
            );

            completeItem.detail = value;

            return completeItem;
        });
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
