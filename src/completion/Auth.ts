"use strict";

import * as vscode from "vscode";
import { CompletionProvider, ParsingResult, Tags } from "..";
import { getPolicies } from "../repositories/auth";
import { wordMatchRegex } from "../support/patterns";

export default class Gate implements CompletionProvider {
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
                class: "Illuminate\\Support\\Facades\\Route",
                functions: ["can", "cannot"],
            },
            {
                class: "Illuminate\\Support\\Facades\\Auth",
                functions: ["can", "cannot"],
            },
            {
                functions: ["@can", "@cannot", "@canany"],
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
        if (result.param.index > 0) {
            return [];
        }

        return Object.entries(getPolicies().items).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                value[0].key,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            const policyClasses = value
                .map((item) => item.policy_class)
                .filter(String);

            if (policyClasses.length > 0) {
                completeItem.detail = policyClasses.join("\n\n");
            }

            return completeItem;
        });
    }
}
