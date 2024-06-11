"use strict";

import * as vscode from "vscode";
import {
    CompletionItemFunction,
    CompletionProvider,
    Model,
    ParsingResult,
    Tags,
} from "..";
import { info } from "../support/logger";
import { parse } from "../support/parser";
import { getModels } from "./../repositories/models";
import { config } from "./../support/config";
import { wordMatchRegex } from "./../support/patterns";

export default class Eloquent implements CompletionProvider {
    private relationMethods = [
        "has",
        "orHas",
        "whereHas",
        "orWhereHas",
        "whereDoesntHave",
        "orWhereDoesntHave",
        "doesntHave",
        "orDoesntHave",
        "hasMorph",
        "orHasMorph",
        "doesntHaveMorph",
        "orDoesntHaveMorph",
        "whereHasMorph",
        "orWhereHasMorph",
        "whereDoesntHaveMorph",
        "orWhereDoesntHaveMorph",
        "withAggregate",
        "withCount",
        "withMax",
        "withMin",
        "withSum",
        "withAvg",
        "with",
    ];

    private firstParamMethods = [
        "where",
        "orWhere",
        "orderBy",
        "orderByDesc",
        "firstWhere",
        "max",
        "sum",
        "select",
        "update",
        "whereColumn",
    ];

    private anyParamMethods = ["firstOrNew", "firstOrCreate"];

    tags(): Tags {
        return getModels().items.map((model) => ({
            class: model.fqn,
            functions: this.getAllFunctions(),
        }));
    }

    provideCompletionItems(
        func: CompletionItemFunction<ParsingResult[]>,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        const model = getModels().items.find((model) => model.fqn === func.fqn);

        info("func tho", func);

        // If we can't find the model, we can't provide completions
        if (!model) {
            return [];
        }

        if (this.anyParamMethods.includes(func.function || "")) {
            return this.getAttributeCompletionItems(document, position, model);
        }

        if (this.firstParamMethods.includes(func.function || "")) {
            if (func.param.index > 0) {
                return [];
            }

            return this.getAttributeCompletionItems(document, position, model);
        }

        if (this.relationMethods.includes(func.function || "")) {
            if (func.param.index > 0) {
                return [];
            }

            return this.getRelationshipCompletionItems(
                document,
                position,
                model,
            );
        }

        return [];
    }

    customCheck(
        func: CompletionItemFunction,
        document: string,
    ): ParsingResult[] | false {
        let results: ParsingResult[] = [];
        let result: ParsingResult | null;

        do {
            result = parse(document, results.length);

            info("got a result", result, results.length);

            if (result) {
                results.push(result);
            }
        } while (this.isValidResult(result));

        // We've added one that caused it to stop, remove it
        results.pop();

        info("got all results", results);

        return results.length === 0 ? false : results;
    }

    private getAllFunctions(): string[] {
        return this.relationMethods
            .concat(this.firstParamMethods)
            .concat(this.anyParamMethods);
    }

    private isValidResult(result: ParsingResult | null): boolean {
        if (!result) {
            return false;
        }

        if (!result.function) {
            return false;
        }

        return (
            typeof this.tags().find((tag) => {
                if (result.fqn && tag.class !== result.fqn) {
                    return false;
                }

                if (!tag.functions) {
                    return false;
                }

                return tag.functions.includes(result.function || "");
            }) !== "undefined"
        );
    }

    private getRelationshipCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        model: Model,
    ): vscode.CompletionItem[] {
        return this.getCompletionItems(
            document,
            position,
            model.relations,
            vscode.CompletionItemKind.Value,
        );
    }

    private getAttributeCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        model: Model,
    ): vscode.CompletionItem[] {
        return this.getCompletionItems(
            document,
            position,
            model.attributes.map(
                (attr: any) =>
                    attr[config<string>("modelAttributeCase", "default")],
            ),
        ).concat(
            this.getCompletionItems(
                document,
                position,
                model.accessors.map(
                    (attr: any) =>
                        attr[config<string>("modelAccessorCase", "snake")],
                ),
                vscode.CompletionItemKind.Constant,
            ),
        );
    }

    private getCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        items: string[],
        type: vscode.CompletionItemKind = vscode.CompletionItemKind.Property,
    ): vscode.CompletionItem[] {
        return items.map((item) => {
            let completeItem = new vscode.CompletionItem(item, type);

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completeItem;
        });
    }
}
