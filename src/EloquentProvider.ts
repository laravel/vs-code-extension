"use strict";

import * as vscode from "vscode";
import Helpers from "./helpers";
import { runInLaravel, template } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import Logger from "./Logger";
import { Provider } from ".";

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

    constructor() {
        this.modelPaths = vscode.workspace
            .getConfiguration("Laravel")
            .get<string[]>("modelsPaths", ["app", "app/Models"]);

        const paths = this.modelPaths.concat(["database/migrations"]);

        paths.forEach((path) =>
            createFileWatcher(`${path}/*.php`, this.load.bind(this)),
        );

        this.load();
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        let out: vscode.CompletionItem[] = [];
        let func = Helpers.parseDocumentFunction(document, position);
        let sourceCode = document.getText();
        let sourceBeforeCursor = sourceCode.substr(
            0,
            document.offsetAt(position),
        );
        let isFactory =
            sourceBeforeCursor.includes("extends Factory") ||
            sourceBeforeCursor.includes("$factory->define(");
        let match = null;
        let objectName = "";
        let modelName = "";
        let modelClass = "";
        let model = null;

        if (func !== null || isFactory) {
            if (func) {
                model = this.getModelFromFunc(sourceBeforeCursor);
            } else {
                model = this.getModelFromFactory(sourceBeforeCursor);
            }

            if (typeof model === "undefined") {
                return [];
            }

            if (
                func &&
                this.relationMethods.some((fn: string) =>
                    func.function.includes(fn),
                )
            ) {
                out = out.concat(
                    this.getCompletionItems(
                        document,
                        position,
                        this.models[modelClass].relations,
                    ),
                );
            } else {
                out = out.concat(
                    this.getCompletionItems(
                        document,
                        position,
                        this.models[modelClass].attributes,
                    ),
                );
            }
        } else {
            let isArrayObject = false;
            let objectRegex =
                /(\$?([A-z0-9_\[\]]+)|(Auth::user\(\)))\-\>[A-z0-9_]*$/g;
            while ((match = objectRegex.exec(sourceBeforeCursor)) !== null) {
                objectName =
                    typeof match[2] !== "undefined" ? match[2] : match[3];
            }
            if (objectName.match(/\$?[A-z0-9_]+\[.+\].*$/g)) {
                isArrayObject = true;
                objectName = objectName.replace(/\[.+\].*$/g, "");
            }
            if (objectName.length > 0 && objectName != "Auth::user()") {
                let modelNameRegex = new RegExp(
                    "\\$" + objectName + "\\s*=\\s*([A-z0-9_\\\\]+)::[^:;]",
                    "g",
                );
                while (
                    (match = modelNameRegex.exec(sourceBeforeCursor)) !== null
                ) {
                    modelName = match[1];
                }
                modelClass = this.getModelClass(modelName, sourceBeforeCursor);
            }
            if (modelClass == "Auth" || objectName == "Auth::user()") {
                if (typeof this.models["App\\User"] !== "undefined") {
                    out = out.concat(
                        this.getModelAttributesCompletionItems(
                            document,
                            position,
                            "App\\User",
                        ),
                    );
                } else if (
                    typeof this.models["App\\Models\\User"] !== "undefined"
                ) {
                    out = out.concat(
                        this.getModelAttributesCompletionItems(
                            document,
                            position,
                            "App\\Models\\User",
                        ),
                    );
                }
            }
            let customVariables = vscode.workspace
                .getConfiguration("Laravel")
                .get<any>("modelVariables", {});
            for (let customVariable in customVariables) {
                if (
                    customVariable === objectName &&
                    typeof this.models[customVariables[customVariable]] !==
                        "undefined"
                ) {
                    out = out.concat(
                        this.getModelAttributesCompletionItems(
                            document,
                            position,
                            customVariables[customVariable],
                        ),
                    );
                }
            }
            for (let i in this.models) {
                if (
                    i == modelClass ||
                    this.models[i].camelCase == objectName ||
                    this.models[i].snakeCase == objectName ||
                    (isArrayObject == true &&
                        (this.models[i].pluralCamelCase == objectName ||
                            this.models[i].pluralSnakeCase == objectName))
                ) {
                    out = out.concat(
                        this.getModelAttributesCompletionItems(
                            document,
                            position,
                            i,
                        ),
                    );
                }
            }
        }
        out = out.filter(
            (v, i, a) => a.map((ai) => ai.label).indexOf(v.label) === i,
        ); // Remove duplicate items
        return out;
    }

    getModelFromFactory(sourceBeforeCursor: string) {
        let match = null;
        let modelName = "";
        let modelClass = "";

        let factoryModelClassRegex =
            /(protected \$model = ([A-Za-z0-9_\\]+)::class;)|(\$factory->define\(\s*([A-Za-z0-9_\\]+)::class)/g;

        if (
            (match = factoryModelClassRegex.exec(sourceBeforeCursor)) !== null
        ) {
            if (typeof match[4] !== "undefined") {
                // Laravel 7 <
                modelName = match[4];
            } else {
                // Laravel >= 8
                modelName = match[2];
            }
        }

        modelClass = this.getModelClass(modelName, sourceBeforeCursor);

        return this.models.find((model) => model.fqn === modelClass);
    }

    getModelFromFunc(sourceBeforeCursor: string) {
        let modelNameRegex = /([A-z0-9_\\]+)::[^:;]+$/g;
        let namespaceRegex = /namespace\s+(.+);/g;
        let namespace = "";
        let match;
        let modelName = "";
        let objectName = "";
        let modelClass = "";

        while ((match = modelNameRegex.exec(sourceBeforeCursor)) !== null) {
            modelName = match[1];
        }

        if (modelName.length === 0) {
            let variableNameRegex = /(\$([A-z0-9_\\]+))->[^;]+$/g;

            while (
                (match = variableNameRegex.exec(sourceBeforeCursor)) !== null
            ) {
                objectName = match[2];
            }

            if (objectName.length > 0) {
                modelNameRegex = new RegExp(
                    "\\$" + objectName + "\\s*=\\s*([A-z0-9_\\\\]+)::[^:]",
                    "g",
                );
                while (
                    (match = modelNameRegex.exec(sourceBeforeCursor)) !== null
                ) {
                    modelName = match[1];
                }
            }
        }

        if ((match = namespaceRegex.exec(sourceBeforeCursor)) !== null) {
            namespace = match[1];
        }

        modelClass = this.getModelClass(modelName, sourceBeforeCursor);

        return this.models.find((model) => model.fqn === modelClass);
    }

    getModelClass(modelName: string, sourceBeforeCursor: string): string {
        if (modelName.length === 0) {
            return "";
        }

        if (modelName.substring(0, 1) === "\\") {
            return modelName.substring(1);
        }

        let modelClassRegex = new RegExp(`use (.+)${modelName};`, "g");
        let match = modelClassRegex.exec(sourceBeforeCursor);

        if (match !== null) {
            return match[1] + modelName;
        }

        return modelName;
    }

    getModelAttributesCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        modelClass: string,
    ): vscode.CompletionItem[] {
        return [];
        // if (!this.models.find((model) => model.fqn === modelClass)) {
        //     return [];
        // }

        // return this.getCompletionItems(
        //     document,
        //     position,
        //     this.models[modelClass].attributes.map(
        //         (attr: any) =>
        //             attr[
        //                 vscode.workspace
        //                     .getConfiguration("Laravel")
        //                     .get<string>("modelAttributeCase", "default")
        //             ],
        //     ),
        // )
        //     .concat(
        //         this.getCompletionItems(
        //             document,
        //             position,
        //             this.models[modelClass].accessors.map(
        //                 (attr: any) =>
        //                     attr[
        //                         vscode.workspace
        //                             .getConfiguration("Laravel")
        //                             .get<string>("modelAccessorCase", "snake")
        //                     ],
        //             ),
        //             vscode.CompletionItemKind.Constant,
        //         ),
        //     )
        //     .concat(
        //         this.getCompletionItems(
        //             document,
        //             position,
        //             this.models[modelClass].relations,
        //             vscode.CompletionItemKind.Value,
        //         ),
        //     );
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
                Helpers.wordMatchRegex,
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
