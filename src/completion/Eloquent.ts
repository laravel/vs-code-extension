"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, Model, Provider, Tags } from "..";
import { getModels } from "./../repositories/models";
import { config } from "./../support/config";
import { wordMatchRegex } from "./../support/patterns";

export default class Eloquent implements Provider {
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
    ];

    private firstParamMethods = [
        "where",
        "orWhere",
        "orderBy",
        "orderByDesc",
        "firstWhere",
        "max",
        "sum",
    ];

    tags(): Tags {
        return {
            classes: getModels().map((model) => model.fqn),
            functions: this.relationMethods.concat(this.firstParamMethods),
        };
        /**
        update,         $flights->each->update(['departed' => false]);

        Destination::addSelect(['last_flight' => Flight::select('name')
        ->whereColumn('destination_id', 'destinations.id')
        ->orderByDesc('arrived_at')

        // Retrieve flight by name or create it if it doesn't exist...
$flight = Flight::firstOrCreate([
    'name' => 'London to Paris'
]);

// Retrieve flight by name or create it with the name, delayed, and arrival_time attributes...
$flight = Flight::firstOrCreate(
    ['name' => 'London to Paris'],
    ['delayed' => 1, 'arrival_time' => '11:30']
);

// Retrieve flight by name or instantiate a new Flight instance...
$flight = Flight::firstOrNew([
    'name' => 'London to Paris'
]);

// Retrieve flight by name or instantiate with the name, delayed, and arrival_time attributes...
$flight = Flight::firstOrNew(
    ['name' => 'Tokyo to Sydney'],
    ['delayed' => 1, 'arrival_time' => '11:30']
);
        **/
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (!func.fqn) {
            // If we don't have a fully qualified name, we can't provide completions
            return [];
        }

        const model = getModels().find((model) => model.fqn === func.fqn);

        // If we can't find the model, we can't provide completions
        if (!model) {
            return [];
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

    getRelationshipCompletionItems(
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

    getAttributeCompletionItems(
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
        )
            .concat(
                this.getCompletionItems(
                    document,
                    position,
                    model.accessors.map(
                        (attr: any) =>
                            attr[config<string>("modelAccessorCase", "snak")],
                    ),
                    vscode.CompletionItemKind.Constant,
                ),
            )
            .concat(
                this.getRelationshipCompletionItems(document, position, model),
            );
    }

    getCompletionItems(
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
