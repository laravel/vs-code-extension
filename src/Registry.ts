"use strict";

import * as vscode from "vscode";
import { Provider } from ".";
import { parse } from "./PHP";
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

        Logger.channel?.info("Parse result", parseResult);

        if (parseResult === null) {
            return [];
        }

        const item =
            this.providers.find((provider) =>
                provider
                    .tags()
                    .classes.find((cls) => cls === parseResult.class),
            ) ||
            this.providers.find((provider) =>
                provider
                    .tags()
                    .functions.find((fn) => fn === parseResult.function),
            );

        if (!item) {
            return [];
        }

        return item.provideCompletionItems(
            {
                class: parseResult.class || null,
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
}
