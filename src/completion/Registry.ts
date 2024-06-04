"use strict";

import * as vscode from "vscode";
import { CompletionProvider } from "..";
import { info } from "../support/logger";
import { ParsingResult, parse } from "./../support/php";

export default class Registry implements vscode.CompletionItemProvider {
    private providers: CompletionProvider[] = [];

    registerProvider(provider: CompletionProvider) {
        this.providers.push(provider);
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
            },
            document,
            position,
            token,
            context,
        );
    }

    private findProviderByClassAndFunction(
        className: string | undefined,
        functionName: string | undefined,
        condition: "AND" | "OR" = "AND",
    ) {
        return this.providers.find((provider) => {
            const classMatch =
                provider.tags().classes.find((cls) => cls === className) !==
                undefined;
            const functionMatch =
                provider.tags().functions.find((fn) => fn === functionName) !==
                undefined;

            return condition === "AND"
                ? classMatch && functionMatch
                : classMatch || functionMatch;
        });
    }

    private getProviderFromResult(parseResult: ParsingResult) {
        // Try for the most specific provider first, then get less specific
        const providerFunc = [
            () =>
                this.findProviderByClassAndFunction(
                    parseResult.fqn,
                    parseResult.function,
                ),
            () =>
                this.findProviderByClassAndFunction(
                    parseResult.class,
                    parseResult.function,
                ),
            () =>
                this.findProviderByClassAndFunction(
                    parseResult.fqn,
                    parseResult.function,
                    "OR",
                ),
            () =>
                this.findProviderByClassAndFunction(
                    parseResult.class,
                    parseResult.function,
                    "OR",
                ),
        ];

        for (const func of providerFunc) {
            const provider = func();

            if (provider) {
                return provider;
            }
        }

        return null;
    }
}
