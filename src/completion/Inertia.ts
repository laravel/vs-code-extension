"use strict";

import * as fs from "fs";
import * as vscode from "vscode";
import { CompletionProvider, ParsingResult, Tags } from "..";
import { getInertiaViews } from "./../repositories/inertia";
import { wordMatchRegex } from "./../support/patterns";

export default class Inertia implements CompletionProvider {
    tags(): Tags {
        return [
            {
                class: "Inertia\\Inertia",
                functions: ["render", "modal"],
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
        const views = getInertiaViews().items;

        if (result.param.index === 0) {
            return Object.entries(views).map(([key]) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Constant,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
        }

        if (
            typeof views[result.parameters[0]] === "undefined" ||
            !result.param.isKey
        ) {
            return [];
        }

        let viewContent = fs.readFileSync(
            views[result.parameters[0]].uri.path,
            "utf8",
        );

        return this.getPropAutoComplete(viewContent).map((variableName) => {
            let variablecompletionItem = new vscode.CompletionItem(
                variableName,
                vscode.CompletionItemKind.Constant,
            );
            variablecompletionItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );
            return variablecompletionItem;
        });
    }

    private getPropAutoComplete(viewContent: string): string[] {
        let variableNames = new Set<string>([]);

        const regexes = [
            {
                regex: /defineProps<({[^}>]+})>/s,
                getPropsString: (match: RegExpMatchArray) =>
                    match[0]
                        .replace("defineProps<", "")
                        .replace(">", "")
                        .replace(/\?\:/g, ":")
                        // Remove all whitespace
                        .replace(/\s/g, ""),
            },
            {
                regex: /defineProps\(({[^})]+})\)/s,
                getPropsString: (match: RegExpMatchArray) =>
                    match[0]
                        .replace("defineProps(", "")
                        .replace(")", "")
                        .replace(/\?\:/g, ":")
                        // Remove all whitespace
                        .replace(/\s/g, ""),
            },
        ];

        for (let { regex, getPropsString } of regexes) {
            let match = viewContent.match(regex);

            if (!match) {
                continue;
            }

            let props = getPropsString(match);

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

            return [...variableNames];
        }

        return [];
    }
}
