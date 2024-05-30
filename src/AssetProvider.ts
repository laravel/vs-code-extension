"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";
import { createFileWatcher } from "./fileWatcher";

export default class AssetProvider implements vscode.CompletionItemProvider {
    private publicFiles: string[] = [];

    constructor() {
        this.load();

        createFileWatcher("public/**/*", this.load.bind(this));
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        const func = Helpers.parseDocumentFunction(document, position);

        if (func === null) {
            return [];
        }

        // TODO: This I don't like
        if (
            !Helpers.tags.asset.functions.some((fn: string) =>
                func.function.includes(fn),
            )
        ) {
            return [];
        }

        return this.publicFiles.map((file) => {
            let completeItem = new vscode.CompletionItem(
                file,
                vscode.CompletionItemKind.Constant,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                Helpers.wordMatchRegex,
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
            let dirFullPath = Helpers.projectPath(dir);

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
