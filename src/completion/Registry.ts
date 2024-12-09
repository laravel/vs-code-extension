"use strict";

import * as vscode from "vscode";
import { CompletionProvider } from "..";
import AutocompleteResult from "../parser/ParsingResult";
import { parse } from "./../support/parser";

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

        return parse(docUntilPosition).then((parseResult) => {
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
        const hasFunc = (funcs: string[]) => {
            return funcs.find((fn) => fn === parseResult.func());
        };

        const isParamIndex = (paramIndex: number | number[] | undefined) => {
            if (typeof paramIndex === "undefined") {
                return true;
            }

            if (Array.isArray(paramIndex)) {
                return paramIndex.includes(parseResult.paramIndex());
            }

            return paramIndex === parseResult.paramIndex();
        };

        return (
            this.providers.find((provider) => {
                if (parseResult.class()) {
                    return provider
                        .tags()
                        .find(
                            (tag) =>
                                tag.class === parseResult.class() &&
                                hasFunc(tag.functions || []) &&
                                isParamIndex(tag.paramIndex),
                        );
                }

                return provider
                    .tags()
                    .find(
                        (tag) =>
                            !tag.class &&
                            hasFunc(tag.functions || []) &&
                            isParamIndex(tag.paramIndex),
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
