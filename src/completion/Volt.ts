"use strict";

import * as vscode from "vscode";
import { info } from "../support/logger";
import { getNormalizedTokens } from "../support/parser";

export default class Blade implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        let isBlade =
            ["blade", "laravel-blade"].includes(document.languageId) ||
            document.fileName.endsWith(".blade.php");

        if (!isBlade) {
            return [];
        }

        if (!document.getText().includes("Livewire\\Volt\\")) {
            return [];
        }

        const tokens = getNormalizedTokens(
            document.getText(
                new vscode.Range(0, 0, position.line, position.character),
            ),
        );

        const closeTagIndex = tokens.findIndex(
            (token) => token[0] === "T_CLOSE_TAG",
        );

        if (closeTagIndex === -1) {
            // We are in the PHP part of the template, nothing to do here
            return [];
        }

        const stateIndex = tokens.findIndex(
            (token) => token[0] === "T_STRING" && token[1] === "state",
        );

        if (stateIndex === -1) {
            // We are not in a state directive, nothing to do here
            return [];
        }

        info("volty info", tokens);

        return [];

        // return this.getDefaultDirectives(document, position).concat(
        //     getCustomBladeDirectives().items.map((directive) => {
        //         let completeItem = new vscode.CompletionItem(
        //             `@${directive.name}${directive.hasParams ? "(...)" : ""}`,
        //             vscode.CompletionItemKind.Keyword,
        //         );

        //         completeItem.insertText = new vscode.SnippetString(
        //             `@${directive.name}${directive.hasParams ? "(${1})" : ""}`,
        //         );

        //         completeItem.range = document.getWordRangeAtPosition(
        //             position,
        //             wordMatchRegex,
        //         );

        //         return completeItem;
        //     }),
        // );
    }
}
