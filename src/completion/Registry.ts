"use strict";

import AutocompleteResult from "@src/parser/AutocompleteResult";
import { parseForAutocomplete } from "@src/support/parser";
import { toArray } from "@src/support/util";
import * as vscode from "vscode";
import { CompletionProvider, FeatureTagParam } from "..";

export default class Registry implements vscode.CompletionItemProvider {
    private providers: CompletionProvider[] = [];

    constructor(...providers: CompletionProvider[]) {
        this.providers.push(...providers);
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.ProviderResult<
        vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
    > {
        const docUntilPosition = document.getText(
            new vscode.Range(0, 0, position.line, position.character),
        );

        return parseForAutocomplete(docUntilPosition).then((parseResult) => {
            if (parseResult === null) {
                return [];
            }

            let provider = this.getProviderFromResult(parseResult);

            if (!provider) {
                provider = this.getProviderByFallback(
                    parseResult,
                    docUntilPosition,
                );
            }

            if (!provider) {
                return [];
            }

            return provider.provideCompletionItems(
                parseResult,
                document,
                position,
                token,
                context,
            );
        });
    }

    private getProviderByClassOrFunction(
        parseResult: AutocompleteResult,
    ): CompletionProvider | null {
        const hasFunc = (funcs: FeatureTagParam["method"]) => {
            if (typeof funcs === "undefined" || funcs === null) {
                return parseResult.func() === null;
            }

            if (typeof funcs === "string") {
                return funcs === parseResult.func();
            }

            return funcs.find((fn) => fn === parseResult.func()) !== undefined;
        };

        const hasClass = (classes: FeatureTagParam["class"]) => {
            if (typeof classes === "undefined" || classes === null) {
                return parseResult.class() === null;
            }

            if (typeof classes === "string") {
                return classes === parseResult.class();
            }

            return (
                classes.find((fn) => fn === parseResult.class()) !== undefined
            );
        };

        const isArgumentIndex = (
            argumentIndex: number | number[] | undefined,
        ) => {
            if (typeof argumentIndex === "undefined") {
                return true;
            }

            if (Array.isArray(argumentIndex)) {
                return argumentIndex.includes(parseResult.paramIndex());
            }

            return argumentIndex === parseResult.paramIndex();
        };

        const isNamedArg = (argumentName: FeatureTagParam["argumentName"]) => {
            // TODO: Make this work
            return true;

            // if (typeof argumentName === "undefined") {
            //     return true;
            // }

            // if (Array.isArray(argumentName)) {
            //     return argumentName.includes(parseResult.argumentName());
            // }

            // return argumentName === parseResult.argumentName();
        };

        return (
            this.providers.find((provider) => {
                return toArray(provider.tags()).find(
                    (tag) =>
                        hasClass(tag.class) &&
                        hasFunc(tag.method) &&
                        isArgumentIndex(tag.argumentIndex) &&
                        isNamedArg(tag.argumentName),
                );
            }) || null
        );
    }

    private getProviderByFallback(
        parseResult: AutocompleteResult,
        document: string,
    ): CompletionProvider | null {
        for (const provider of this.providers) {
            if (!provider.customCheck) {
                continue;
            }

            const result = provider.customCheck(parseResult, document);

            if (result !== false) {
                return provider;
            }
        }

        return null;
    }

    private getProviderFromResult(
        parseResult: AutocompleteResult,
    ): CompletionProvider | null {
        return this.getProviderByClassOrFunction(parseResult);
    }
}
