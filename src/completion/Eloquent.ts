"use strict";

import * as vscode from "vscode";
import {
    CompletionProvider,
    Eloquent as EloquentType,
    ParsingResult,
    Tags,
} from "..";
import { info } from "../support/logger";
import { parse } from "../support/parser";
import { getModels } from "./../repositories/models";
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
        return Object.entries(getModels().items).map(([key]) => ({
            class: key,
            functions: this.getAllFunctions(),
        }));
    }

    provideCompletionItems(
        result: ParsingResult<ParsingResult[]>,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        let finalResult = result.additionalInfo?.pop() || result;

        const model = getModels().items[finalResult.fqn || ""];

        // If we can't find the model, we can't provide completions
        if (!model) {
            return [];
        }

        if (this.anyParamMethods.includes(finalResult.function || "")) {
            return this.getAttributeCompletionItems(document, position, model);
        }

        if (this.firstParamMethods.includes(finalResult.function || "")) {
            if (finalResult.param.index > 0) {
                return [];
            }

            return this.getAttributeCompletionItems(document, position, model);
        }

        if (this.relationMethods.includes(finalResult.function || "")) {
            if (finalResult.param.index > 0) {
                return [];
            }

            if (finalResult.param.isKey) {
                return this.getRelationshipCompletionItems(
                    document,
                    position,
                    model,
                );
            }

            const relationKey = finalResult.param.keys.pop();

            info("relationKey", relationKey, finalResult.param.keys);

            if (!relationKey) {
                return [];
            }

            const relation = model.relations.find(
                (relation) => relation.name === relationKey,
            );

            info("relation", relation, relationKey);

            if (!relation) {
                return [];
            }

            const relationModel = getModels().items[relation.related];

            return this.getAttributeCompletionItems(
                document,
                position,
                relationModel,
            );
        }

        return [];
    }

    customCheck(
        result: ParsingResult,
        document: string,
    ): ParsingResult[] | false {
        let results: ParsingResult[] = [];
        let customResult: ParsingResult | null;

        do {
            customResult = parse(document, results.length);

            if (customResult) {
                results.push(customResult);
            }
        } while (this.isValidResult(customResult));

        // We've added one that caused it to stop, remove it
        results.pop();

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
        model: EloquentType.Model,
    ): vscode.CompletionItem[] {
        return this.getCompletionItems(
            document,
            position,
            model.relations.map((relation) => relation.name),
            vscode.CompletionItemKind.Value,
        );
    }

    private getAttributeCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        model: EloquentType.Model,
    ): vscode.CompletionItem[] {
        return this.getCompletionItems(
            document,
            position,
            model.attributes.map((attribute) => attribute.name),
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
