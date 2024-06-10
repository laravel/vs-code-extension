"use strict";

import * as vscode from "vscode";
import { CompletionProvider } from "..";
import { info } from "../support/logger";
import { ParsingResult, parse } from "./../support/parser";

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

        const provider = this.getProviderFromResult(parseResult);

        if (!provider) {
            return [];
        }

        return provider.provideCompletionItems(
            {
                class: parseResult.class || null,
                fqn: parseResult.fqn || null,
                function: parseResult.function || null,
                parameters: parseResult.parameters,
                param: parseResult.param,
                classDefinition: parseResult.classDefinition || null,
                functionDefinition: parseResult.functionDefinition || null,
                classExtends: parseResult.classExtends || null,
                classImplements: parseResult.classImplements || [],
            },
            document,
            position,
            token,
            context,
        );
    }

    private getProviderFromResult(
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

                // if (parseResult.classExtends) {
                //     return provider
                //         .tags()
                //         .find(
                //             (tag) =>
                //                 tag.class === parseResult.classDefinition && (tag.function || []).find(
                //                     (fn) => fn === parseResult.function,
                //                 ),
                //         );
                //         );
                // }

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
}
