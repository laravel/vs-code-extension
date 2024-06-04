"use strict";

import * as vscode from "vscode";
import { CompletionItemFunction, Provider, Tags } from ".";
import { runInLaravel, template } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import { config } from "./support/config";
import { wordMatchRegex } from "./support/patterns";

interface Model {
    fqn: string;
    attributes: {
        default: string;
        camel: string;
        snake: string;
    }[];
    accessors: string[];
    relations: string[];
    camelCase: string;
    snakeCase: string;
    pluralCamelCase: string;
    pluralSnakeCase: string;
}

export default class EloquentProvider implements Provider {
    private models: Model[] = [];
    private modelPaths: string[] = [];

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

    constructor() {
        this.modelPaths = config<string[]>("modelsPaths", [
            "app",
            "app/Models",
        ]);

        const paths = this.modelPaths.concat(["database/migrations"]);

        paths.forEach((path) =>
            createFileWatcher(`${path}/*.php`, this.load.bind(this)),
        );

        this.load();
    }

    tags(): Tags {
        return {
            classes: this.models.map((model) => model.fqn),
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

        const model = this.models.find((model) => model.fqn === func.fqn);

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

    load() {
        runInLaravel<{
            [key: string]: Omit<Model, "fqn">;
        }>(
            template("eloquent-provider", {
                model_paths: JSON.stringify(this.modelPaths),
            }),
            "Eloquent Attributes and Relations",
        )
            .then((result) => {
                this.models = Object.entries(result).map(([key, value]) => ({
                    ...value,
                    fqn: key,
                }));
            })
            .catch(function (e) {
                console.error(e);
            });
    }
}
