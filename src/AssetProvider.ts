"use strict";

import * as fs from "fs";
import * as vscode from "vscode";
import { CompletionItemFunction, Provider, Tags } from ".";
import { createFileWatcher } from "./fileWatcher";
import { wordMatchRegex } from "./support/patterns";
import { projectPath } from "./support/project";

export default class AssetProvider implements Provider {
    private publicFiles: string[] = [];

    constructor() {
        this.load();

        createFileWatcher("public/**/*", this.load.bind(this));
    }

    tags(): Tags {
        return { classes: [], functions: ["asset"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return this.publicFiles.map((file) => {
            let completeItem = new vscode.CompletionItem(
                file,
                vscode.CompletionItemKind.Constant,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completeItem;
        });
    }

    load() {
        this.publicFiles = this.getFiles().map((path) =>
            path.replace(/\/?public\/?/g, ""),
        );
    }

    getFiles(dir: string = "public", depth: number = 0): string[] {
        try {
            let dirFullPath = projectPath(dir);

            if (!fs.existsSync(dirFullPath)) {
                return [];
            }

            if (depth > 10) {
                return [];
            }

            return fs
                .readdirSync(dirFullPath)
                .map((filePath) => {
                    let fullFilePath = `${dirFullPath}/${filePath}`;
                    let shortFilePath = `${dir}/${filePath}`;
                    let stat = fs.lstatSync(fullFilePath);

                    if (stat.isDirectory()) {
                        return this.getFiles(shortFilePath, depth + 1);
                    }

                    if (
                        stat.isFile() &&
                        filePath[0] !== "." &&
                        filePath.endsWith(".php") === false
                    ) {
                        return shortFilePath;
                    }

                    return [];
                })
                .flat();
        } catch (exception) {
            console.error(exception);

            return [];
        }
    }
}
