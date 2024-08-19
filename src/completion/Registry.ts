"use strict";

import * as vscode from "vscode";
import { CompletionProvider } from "..";
import ParsingResult from "../parser/ParsingResult";
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
        parseResult: ParsingResult,
    ): CompletionProvider | null {
        return (
            this.providers.find((provider) => {
                if (parseResult.class()) {
                    return provider
                        .tags()
                        .find(
                            (tag) =>
                                tag.class === parseResult.class() &&
                                (tag.functions || []).find(
                                    (fn) => fn === parseResult.func(),
                                ),
                        );
                }

                return provider
                    .tags()
                    .find(
                        (tag) =>
                            !tag.class &&
                            (tag.functions || []).find(
                                (fn) => fn === parseResult.func(),
                            ),
                    );
            }) || null
        );
    }

    private getProviderByFallback(
        parseResult: ParsingResult,
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
        parseResult: ParsingResult,
    ): CompletionProvider | null {
        return this.getProviderByClassOrFunction(parseResult);
    }
}
