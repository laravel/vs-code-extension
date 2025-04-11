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

export const completionProvider: CompletionProvider = {
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
        if (!config("model.completion", true)) {
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