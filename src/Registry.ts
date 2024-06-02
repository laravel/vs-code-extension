"use strict";

import * as vscode from "vscode";
import { Provider } from ".";
import { ParsingResult, parse } from "./PHP";
import Logger from "./Logger";

export default class Registry implements vscode.CompletionItemProvider {
    private providers: Provider[] = [];

    registerProvider(provider: Provider) {
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

        Logger.info("Parse result", parseResult);

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
                paramIndex: parseResult.paramIndex,
            },
            document,
            position,
            token,
            context,
        );
    }

    private getProviderByClass(className: string | undefined) {
        return this.providers.find((provider) =>
            provider.tags().classes.find((cls) => cls === className),
        );
    }

    private getProviderByFunction(functionName: string | undefined) {
        return this.providers.find((provider) =>
            provider.tags().functions.find((fn) => fn === functionName),
        );
    }

    private getProviderFromResult(parseResult: ParsingResult) {
        // Try for the most specific provider first, then get less specific
        const providerFunc = [
            () =>
                this.getProviderByClass(parseResult.fqn) &&
                this.getProviderByFunction(parseResult.function),
            () =>
                this.getProviderByClass(parseResult.class) &&
                this.getProviderByFunction(parseResult.function),
            () =>
                this.getProviderByClass(parseResult.fqn) ||
                this.getProviderByFunction(parseResult.function),
            () =>
                this.getProviderByClass(parseResult.class) ||
                this.getProviderByFunction(parseResult.function),
        ].find((provider) => provider() !== undefined);

        return providerFunc ? providerFunc() : null;
    }
}
