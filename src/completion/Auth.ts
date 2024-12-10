"use strict";

import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import AutocompleteResult from "../parser/AutocompleteResult";
import { getPolicies } from "../repositories/auth";
import { wordMatchRegex } from "../support/patterns";

export default class Gate implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: facade("Gate"),
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
                paramIndex: 0,
            },
            {
                class: facade("Route"),
                functions: ["can", "cannot"],
                paramIndex: 0,
            },
            {
                class: facade("Auth"),
                functions: ["can", "cannot"],
                paramIndex: 0,
            },
            {
                functions: ["@can", "@cannot", "@canany"],
                paramIndex: 0,
            },
        ];
    }

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (result.paramCount() > 0) {
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
