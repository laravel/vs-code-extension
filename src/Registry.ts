"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import { resolve } from "path";
import Logger from "./Logger";
import { runInLaravel } from "./PHP";
import { Provider } from ".";
import Helpers from "./helpers";

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
        const func = this.parseDocumentFunction(document, position);

        Logger.channel?.info("func", func);

        if (func === null) {
            return [];
        }

        const item =
            this.providers.find((provider) =>
                provider.tags().classes.find((cls) => cls === func.class),
            ) ||
            this.providers.find((provider) =>
                provider.tags().functions.find((fn) => fn === func.function),
            );

        if (!item) {
            return [];
        }

        return item.provideCompletionItems(
            func,
            document,
            position,
            token,
            context,
        );
    }

    /**
     * Parse php function call.
     *
     * @param text
     * @param position
     */
    parseFunction(text: string, position: number, level: number = 0): any {
        var out: any = null;

        const classes = this.providers
            .map((provider) => provider.tags().classes)
            .flat();

        Logger.channel?.info("classes", classes);

        var regexPattern =
            "(((" +
            classes.join("|") +
            ")::)?([@A-Za-z0-9_]+))((\\()((?:[^)(]|\\((?:[^)(]|\\([^)(]*\\))*\\))*)(\\)|$))";
        var functionRegex = new RegExp(regexPattern, "g");
        var paramsRegex =
            /((\s*\,\s*)?)(\[[\s\S]*(\]|$)|array\[\s\S]*(\)|$)|(\"((\\\")|[^\"])*(\"|$))|(\'((\\\')|[^\'])*(\'|$)))/g;
        var inlineFunctionMatch =
            /\((([\s\S]*\,)?\s*function\s*\(.*\)\s*\{)([\S\s]*)\}/g;

        text = text.substring(Math.max(0, position - 200), 400);
        position -= Math.max(0, position - 200);

        var match = null;
        var match2 = null;

        // if (
        //     Helpers.cachedParseFunction !== null &&
        //     Helpers.cachedParseFunction.text === text &&
        //     position === Helpers.cachedParseFunction.position
        // ) {
        //     return Helpers.cachedParseFunction.out;
        // }

        if (level >= 6) {
            return null;
        }

        Logger.channel?.info("text", text);

        while ((match = functionRegex.exec(text)) !== null) {
            if (
                position >= match.index &&
                match[0] &&
                position < match.index + match[0].length
            ) {
                console.log("match", match, inlineFunctionMatch.exec(match[0]));
                if (
                    (match2 = inlineFunctionMatch.exec(match[0])) !== null &&
                    typeof match2[3] === "string" &&
                    typeof match[1] === "string" &&
                    typeof match[6] === "string" &&
                    typeof match2[1] === "string"
                ) {
                    out = this.parseFunction(
                        match2[3],
                        position -
                            (match.index +
                                match[1].length +
                                match[6].length +
                                match2[1].length),
                        level + 1,
                    );
                } else if (
                    typeof match[1] === "string" &&
                    typeof match[6] === "string" &&
                    typeof match[7] === "string"
                ) {
                    console.log("uh hi we are herereree", match[7].length);
                    var textParameters = [];
                    var paramIndex = null;
                    var paramIndexCounter = 0;
                    var paramsPosition =
                        position -
                        (match.index + match[1].length + match[6].length);

                    var functionInsideParameter;
                    if (
                        match[7].length >= 4 &&
                        (functionInsideParameter = this.parseFunction(
                            match[7],
                            paramsPosition,
                        ))
                    ) {
                        return functionInsideParameter;
                    }

                    console.log("params regex", paramsRegex.exec(match[7]));

                    while ((match2 = paramsRegex.exec(match[7])) !== null) {
                        textParameters.push(match2[3]);
                        if (
                            paramsPosition >= match2.index &&
                            typeof match2[0] === "string" &&
                            paramsPosition <= match2.index + match2[0].length
                        ) {
                            paramIndex = paramIndexCounter;
                        }
                        paramIndexCounter++;
                    }
                    var functionParametrs = [];
                    for (let i in textParameters) {
                        functionParametrs.push(this.evalPhp(textParameters[i]));
                    }
                    out = {
                        class: match[3],
                        function: match[4],
                        paramIndex: paramIndex,
                        parameters: functionParametrs,
                        textParameters: textParameters,
                    };
                }

                if (level === 0) {
                    Helpers.cachedParseFunction = { text, position, out };
                }
            }
        }

        return out;
    }

    /**
     * Parse php function call from vscode editor.
     *
     * @param document
     * @param position
     */
    parseDocumentFunction(
        document: vscode.TextDocument,
        position: vscode.Position,
    ) {
        return this.parseFunction(
            document.getText(),
            document.offsetAt(position),
        );
    }

    /**
     * Convert php variable defination to javascript variable.
     * @param code
     */
    evalPhp(code: string): any {
        var out = this.parsePhp("<?php " + code + ";");
        if (out && typeof out.children[0] !== "undefined") {
            return out.children[0].expression.value;
        }
        return undefined;
    }

    /**
     * Parse php code with 'php-parser' package.
     * @param code
     */
    parsePhp(code: string): any {
        if (!Helpers.phpParser) {
            var PhpEngine = require("php-parser");
            Helpers.phpParser = new PhpEngine({
                parser: {
                    extractDoc: true,
                    php7: true,
                },
                ast: {
                    withPositions: true,
                },
            });
        }
        try {
            return Helpers.phpParser.parseCode(code);
        } catch (exception) {
            return null;
        }
    }
}
