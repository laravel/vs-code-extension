"use strict";

import * as vscode from "vscode";
import { CompletionProvider, Eloquent as EloquentType } from "..";
import AutocompleteResult from "../parser/AutocompleteResult";
import { getModels } from "./../repositories/models";
import { wordMatchRegex } from "./../support/patterns";

export class Eloquent implements CompletionProvider {
    private relationMethods = [
        "doesntHave",
        "doesntHaveMorph",
        "has",
        "hasMorph",
        "orDoesntHave",
        "orDoesntHaveMorph",
        "orHas",
        "orHasMorph",
        "orWhereDoesntHave",
        "orWhereDoesntHaveMorph",
        "orWhereHas",
        "orWhereHasMorph",
        "whereDoesntHave",
        "whereDoesntHaveMorph",
        "whereHas",
        "whereHasMorph",
        "with",
        "withAggregate",
        "withAvg",
        "withCount",
        "withMax",
        "withMin",
        "withSum",
    ];

    private firstParamMethods = [
        "create",
        "fill",
        "firstWhere",
        "make",
        "max",
        "orderBy",
        "orderByDesc",
        "orWhere",
        "select",
        "sum",
        "update",
        "where",
        "whereColumn",
        "whereIn",
    ];

    private anyParamMethods = ["firstOrNew", "firstOrCreate"];

    tags() {
        return Object.entries(getModels().items).map(([key]) => ({
            class: key,
            method: this.getAllFunctions(),
        }));
    }

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        const info = result.getInfo("eloquent");

        const className = info?.class || result.class();

        if (className && !result.func() && getModels().items[className]) {
            if (result.currentParamIsArray() && result.fillingInArrayKey()) {
                return this.getFillableAttributeCompletionItems(
                    result,
                    document,
                    position,
                    getModels().items[className],
                );
            }

            return [];
        }

        if (!className || !result.func()) {
            return [];
        }

        const model = getModels().items[className];

        // If we can't find the model, we can't provide completions
        if (!model) {
            return [];
        }

        if (this.anyParamMethods.includes(result.func()!)) {
            if (result.isParamIndex(0)) {
                return this.getAttributeCompletionItems(
                    document,
                    position,
                    model,
                );
            }

            return this.getFillableAttributeCompletionItems(
                result,
                document,
                position,
                model,
            );
        }

        if (this.firstParamMethods.includes(result.func()!)) {
            if (result.paramIndex() > 0) {
                return [];
            }

            if (["create", "make", "fill"].includes(result.func()!)) {
                if (
                    result.currentParamIsArray() &&
                    result.fillingInArrayKey()
                ) {
                    return this.getFillableAttributeCompletionItems(
                        result,
                        document,
                        position,
                        model,
                    );
                }

                return [];
            }

            return this.getAttributeCompletionItems(document, position, model);
        }

        if (this.relationMethods.includes(result.func()!)) {
            if (result.paramIndex() > 0) {
                return [];
            }

            if (!result.currentParamIsArray() || result.fillingInArrayKey()) {
                return this.getRelationshipCompletionItems(
                    result,
                    document,
                    position,
                    model,
                );
            }

            const relationKey = result.param().value;

            info("Relation key", relationKey);

            if (!relationKey) {
                return [];
            }

            const relation = model.relations.find(
                (relation) => relation.name === relationKey,
            );

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
        result: AutocompleteResult,
        document: string,
    ): AutocompleteResult | false {
        const func = result.func();

        if (!func) {
            if (result.class() && getModels().items[result.class()!]) {
                // We are probably in an object instantiation
                return result;
            }

            return false;
        }

        if (!this.getAllFunctions().includes(func)) {
            return false;
        }

        let foundClass = null;

        // We have a method we're interested in, let's see if we can find a class
        result.loop((context) => {
            const r = new AutocompleteResult(context);

            if (
                !r.class() ||
                r.isClass("Illuminate\\Database\\Eloquent\\Builder")
            ) {
                return true;
            }

            if (!getModels().items[r.class()]) {
                return false;
            }

            if (!r.func() || !this.relationMethods.includes(r.func())) {
                foundClass = r.class();

                return false;
            }

            const lastArg = r.param();

            if (lastArg.type === "array" && lastArg.children.length > 0) {
                const relationKey =
                    lastArg.children[lastArg.children.length - 1].key.value;

                if (!relationKey) {
                    return false;
                }

                const relation = getModels().items[r.class()].relations.find(
                    (relation) => relation.name === relationKey,
                );

                if (relation) {
                    foundClass = relation.related;
                }
            }

            return false;
        });

        if (foundClass) {
            result.addInfo("eloquent", { class: foundClass });

            return result;
        }

        return false;
    }

    private getAllFunctions(): string[] {
        return this.relationMethods
            .concat(this.firstParamMethods)
            .concat(this.anyParamMethods);
    }

    private getRelationshipCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        model: EloquentType.Model,
    ): vscode.CompletionItem[] {
        return this.getCompletionItems(
            document,
            position,
            model.relations
                .map((relation) => relation.name)
                .filter(
                    (name) => !result.currentParamArrayKeys().includes(name),
                ),
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
            model.attributes
                .filter(
                    (attribute) =>
                        !["accessor", "attribute"].includes(
                            attribute.cast || "",
                        ),
                )
                .map((attribute) => attribute.name),
        );
    }

    private getFillableAttributeCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        model: EloquentType.Model,
    ): vscode.CompletionItem[] {
        return this.getCompletionItems(
            document,
            position,
            model.attributes
                .filter((attribute) => attribute.fillable)
                .map((attribute) => attribute.name)
                .filter(
                    (name) => !result.currentParamArrayKeys().includes(name),
                ),
        );
    }

    private getCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        items: string[],
        type: vscode.CompletionItemKind = vscode.CompletionItemKind.Field,
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
