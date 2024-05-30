"use strict";

import * as vscode from "vscode";
import Helpers from "./helpers";
import { artisan, runInLaravel, template } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import Logger from "./Logger";

export default class EloquentProvider implements vscode.CompletionItemProvider {
    private models: { [key: string]: any } = {};

    constructor() {
        const paths = vscode.workspace
            .getConfiguration("Laravel")
            .get<Array<string>>("modelsPaths", ["app", "app/Models"])
            .concat(["database/migrations"]);

        paths.forEach((path) =>
            createFileWatcher(`${path}/*.php`, this.loadModels.bind(this)),
        );

        this.loadModels();
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): Array<vscode.CompletionItem> {
        var out: Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        let sourceCode = document.getText();
        let sourceBeforeCursor = sourceCode.substr(
            0,
            document.offsetAt(position),
        );
        var isFactory =
            sourceBeforeCursor.includes("extends Factory") ||
            sourceBeforeCursor.includes("$factory->define(");
        var match = null;
        var objectName = "";
        var modelName = "";
        var modelClass = "";
        if (func != null || isFactory) {
            if (func) {
                let modelNameRegex = /([A-z0-9_\\]+)::[^:;]+$/g;
                var namespaceRegex = /namespace\s+(.+);/g;
                var namespace = "";
                while (
                    (match = modelNameRegex.exec(sourceBeforeCursor)) !== null
                ) {
                    modelName = match[1];
                }
                if (modelName.length === 0) {
                    let variableNameRegex = /(\$([A-z0-9_\\]+))->[^;]+$/g;
                    while (
                        (match = variableNameRegex.exec(sourceBeforeCursor)) !==
                        null
                    ) {
                        objectName = match[2];
                    }
                    if (objectName.length > 0) {
                        modelNameRegex = new RegExp(
                            "\\$" +
                                objectName +
                                "\\s*=\\s*([A-z0-9_\\\\]+)::[^:]",
                            "g",
                        );
                        while (
                            (match =
                                modelNameRegex.exec(sourceBeforeCursor)) !==
                            null
                        ) {
                            modelName = match[1];
                        }
                    }
                }
                if (
                    (match = namespaceRegex.exec(sourceBeforeCursor)) !== null
                ) {
                    namespace = match[1];
                }
                modelClass = this.getModelClass(modelName, sourceBeforeCursor);
            } else {
                var factoryModelClassRegex =
                    /(protected \$model = ([A-Za-z0-9_\\]+)::class;)|(\$factory->define\(\s*([A-Za-z0-9_\\]+)::class)/g;
                if (
                    (match =
                        factoryModelClassRegex.exec(sourceBeforeCursor)) !==
                    null
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
            }

            if (typeof this.models[modelClass] !== "undefined") {
                if (
                    func &&
                    Helpers.relationMethods.some((fn: string) =>
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

    getModelClass(modelName: string, sourceBeforeCursor: string) {
        let match = null;
        let modelClass = "";
        if (modelName.length === 0) {
            return "";
        }
        var modelClassRegex = new RegExp("use (.+)" + modelName + ";", "g");
        if (modelName.substr(0, 1) === "\\") {
            modelClass = modelName.substr(1);
        } else if (
            (match = modelClassRegex.exec(sourceBeforeCursor)) !== null
        ) {
            modelClass = match[1] + modelName;
        } else {
            modelClass = modelName;
        }
        return modelClass;
    }

    getModelAttributesCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        modelClass: string,
    ): Array<vscode.CompletionItem> {
        let out: Array<vscode.CompletionItem> = [];
        if (typeof this.models[modelClass] !== "undefined") {
            out = out.concat(
                this.getCompletionItems(
                    document,
                    position,
                    this.models[modelClass].attributes.map(
                        (attr: any) =>
                            attr[
                                vscode.workspace
                                    .getConfiguration("Laravel")
                                    .get<string>(
                                        "modelAttributeCase",
                                        "default",
                                    )
                            ],
                    ),
                ),
            );
            out = out.concat(
                this.getCompletionItems(
                    document,
                    position,
                    this.models[modelClass].accessors.map(
                        (attr: any) =>
                            attr[
                                vscode.workspace
                                    .getConfiguration("Laravel")
                                    .get<string>("modelAccessorCase", "snake")
                            ],
                    ),
                    vscode.CompletionItemKind.Constant,
                ),
            );
            out = out.concat(
                this.getCompletionItems(
                    document,
                    position,
                    this.models[modelClass].relations,
                    vscode.CompletionItemKind.Value,
                ),
            );
        }
        return out;
    }

    getCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        items: Array<string>,
        type: vscode.CompletionItemKind = vscode.CompletionItemKind.Property,
    ): Array<vscode.CompletionItem> {
        let out: Array<vscode.CompletionItem> = [];
        for (let item of items) {
            var completeItem = new vscode.CompletionItem(item, type);
            completeItem.range = document.getWordRangeAtPosition(
                position,
                Helpers.wordMatchRegex,
            );
            out.push(completeItem);
        }
        return out;
    }

    loadModels() {
        // artisan("model:show User --json").then((result) => {
        //     Logger.channel?.info("Model results", result);
        // });
        // return;
        // TODO: Probably just run this
        // php artisan model:show User --json
        runInLaravel(
            template("eloquent-provider", {
                model_paths: JSON.stringify(
                    vscode.workspace
                        .getConfiguration("Laravel")
                        .get<Array<string>>("modelsPaths", [
                            "app",
                            "app/Models",
                        ]),
                ),
            }),
            "Eloquent Attributes and Relations",
        )
            .then((result) => {
                if (result) {
                    this.models = JSON.parse(result);
                }
            })
            .catch(function (e) {
                console.error(e);
            });
    }
}
