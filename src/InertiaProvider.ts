"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";
import { CompletionItemFunction, Provider, Tags } from ".";
import InertiaRegistry from "./InertiaRegistry";

export default class InertiaProvider implements Provider {
    private viewRegistry: typeof InertiaRegistry;

    constructor() {
        this.viewRegistry = InertiaRegistry;
    }

    tags(): Tags {
        return {
            classes: ["Inertia"],
            functions: ["render", "modal"],
        };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (func.param.index === 0) {
            return Object.entries(this.viewRegistry.views).map(([key]) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Constant,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    Helpers.wordMatchRegex,
                );

                return completionItem;
            });
        }

        if (
            typeof this.viewRegistry.views[func.parameters[0]] ===
                "undefined" ||
            !func.param.isKey
        ) {
            return [];
        }

        let viewContent = fs.readFileSync(
            this.viewRegistry.views[func.parameters[0]].uri.path,
            "utf8",
        );

        let variableRegex = /defineProps<({.+})>/s;
        let r: RegExpExecArray | null = null;
        let variableNames = new Set<string>([]);

        let match = viewContent.match(variableRegex);

        if (!match) {
            return [];
        }

        let props = match[0]
            .replace("defineProps<", "")
            .replace(">", "")
            .replace(/\?\:/g, ":")
            // Remove all whitespace
            .replace(/\s/g, "");

        // Chop off the starting and ending curly braces
        props = props.substring(1, props.length - 1);

        let nestedLevel = 0;

        props.split(";").forEach((prop) => {
            if (prop.includes("{")) {
                nestedLevel++;
            }

            if (prop.includes("}")) {
                nestedLevel--;
            }

            if (nestedLevel > 0 || !prop.includes(":")) {
                return;
            }

            let [key] = prop.split(":");

            variableNames.add(key);
        });

        return [...variableNames].map((variableName) => {
            let variablecompletionItem = new vscode.CompletionItem(
                variableName,
                vscode.CompletionItemKind.Constant,
            );
            variablecompletionItem.range = document.getWordRangeAtPosition(
                position,
                Helpers.wordMatchRegex,
            );
            return variablecompletionItem;
        });
    }

    getYields(func: string, documentText: string): vscode.CompletionItem[] {
        let extendsRegex = /@extends\s*\([\'\"](.+)[\'\"]\)/g;
        let regexResult = extendsRegex.exec(documentText);

        if (!regexResult) {
            return [];
        }

        if (typeof this.viewRegistry.views[regexResult[1]] === "undefined") {
            return [];
        }

        let parentContent = fs.readFileSync(
            this.viewRegistry.views[regexResult[1]].uri.path,
            "utf8",
        );
        let yieldRegex =
            func === "@push"
                ? /@stack\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g
                : /@yield\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g;

        let yieldNames = new Set<string>([]);

        while ((regexResult = yieldRegex.exec(parentContent))) {
            yieldNames.add(regexResult[1]);
        }

        return [...yieldNames]
            .map(
                (yieldName) =>
                    new vscode.CompletionItem(
                        yieldName,
                        vscode.CompletionItemKind.Constant,
                    ),
            )
            .concat(this.getYields(func, parentContent));
    }
}
