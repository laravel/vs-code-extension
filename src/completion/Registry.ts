"use strict";

import * as vscode from "vscode";
import { CompletionProvider, ParsingResult } from "..";
import { info } from "../support/logger";
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

        const parseResult = parse(docUntilPosition);

        info("Parse result", parseResult);

        if (parseResult === null) {
            return [];
        }

        let provider = this.getProviderFromResult(parseResult);
        let additionalInfo = null;

        if (!provider) {
            [provider, additionalInfo] = this.getProviderByFallback(
                parseResult,
                docUntilPosition,
            );
        }

        if (!provider) {
            return [];
        }

        if (additionalInfo) {
            parseResult.additionalInfo = additionalInfo;
        }

        return provider.provideCompletionItems(
            parseResult,
            document,
            position,
            token,
            context,
        );
    }

    private getProviderByClassOrFunction(
        parseResult: ParsingResult,
    ): CompletionProvider | null {
        return (
            this.providers.find((provider) => {
                if (parseResult.fqn) {
                    return provider
                        .tags()
                        .find(
                            (tag) =>
                                tag.class === parseResult.fqn &&
                                (tag.functions || []).find(
                                    (fn) => fn === parseResult.function,
                                ),
                        );
                }

                return provider
                    .tags()
                    .find(
                        (tag) =>
                            !tag.class &&
                            (tag.functions || []).find(
                                (fn) => fn === parseResult.function,
                            ),
                    );
            }) || null
        );
    }

    private getProviderByFallback(
        parseResult: ParsingResult,
        document: string,
    ): [CompletionProvider | null, any] {
        for (const provider of this.providers) {
            if (!provider.customCheck) {
                continue;
            }

            const result = provider.customCheck(parseResult, document);

            if (result !== false) {
                return [provider, result];
            }
        }

        return [null, null];
    }

    private getProviderFromResult(
        parseResult: ParsingResult,
    ): CompletionProvider | null {
        return this.getProviderByClassOrFunction(parseResult);
    }
}
