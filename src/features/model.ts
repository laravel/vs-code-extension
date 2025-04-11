import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getModelByName, getModels } from "@src/repositories/models";
import { config } from "@src/support/config";
import { camel, snake } from "@src/support/str";
import * as vscode from "vscode";
import {
    CompletionProvider,
    Eloquent,
    FeatureTag,
} from "..";

export const completionModelProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(
        doc: vscode.TextDocument,
        pos: vscode.Position,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (!config("model.completion_model", true)) {
            return undefined;
        }

        const line = doc.lineAt(pos.line).text;
        const linePrefix = line.substring(pos.character - 1, pos.character);

        if (linePrefix !== '$') {
            return undefined;
        }

        console.log('models', Object.entries(getModels().items).flatMap(([, value]) => {
            return value.name_cases.map((name) => {
                return new vscode.CompletionItem(name);
            });
        }));

        return Object.entries(getModels().items).flatMap(([, value]) => {
            return value.name_cases.map((name) => {
                return new vscode.CompletionItem(name);
            });
        });
    },
};

export const completionPropertyProvider: CompletionProvider = {
    tags() {
        return Object.values(getModels().items).flatMap(model => {
            return [
                {
                    method: [...model.name_cases],
                },
                {
                    name: [...model.name_cases]
                }
            ];
        }).filter(item => item !== null) as FeatureTag;
    },

    provideCompletionItems(
        result: AutocompleteResult,
    ): vscode.CompletionItem[] {
        if (!config("model.completion_property", true)) {
            return [];
        }

        const name = result.name() ?? result.func();

        if (!name) {
            return [];
        }

        const model = getModelByName(name);

        if (!model) {
            return [];
        }

        const createCompleteItem = (item: Eloquent.Attribute | Eloquent.Relation) => {
            let completeItem = new vscode.CompletionItem(
                item.name,
                vscode.CompletionItemKind.Property,
            );

            if (item.type) {
                completeItem.detail = item.type;
            }

            return completeItem;
        };

        return model.attributes.map(createCompleteItem)
            .concat(model.relations.map(createCompleteItem));
    },
};