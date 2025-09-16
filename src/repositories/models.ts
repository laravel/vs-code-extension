import { repository } from ".";
import { Eloquent } from "..";
import { writeEloquentDocBlocks } from "../support/docblocks";
import { runInLaravel, template } from "./../support/php";

const modelPaths = ["app", "app/Models"];

const load = () => {
    return runInLaravel<Eloquent.Result>(
        template("models", {
            model_paths: JSON.stringify(modelPaths),
        }),
        "Eloquent Attributes and Relations",
    ).then((result) => {
        if (!result) {
            return {};
        }

        writeEloquentDocBlocks(result.models, result.builderMethods);

        return result.models;
    });
};

export const getModelByName = (name: string): Eloquent.Model | undefined => {
    const model = Object.entries(getModels().items).find(([, value]) => {
        return value.name_cases.includes(name);
    });

    return model?.[1];
};

export const getModels = repository<Eloquent.Models>({
    load,
    pattern: modelPaths
        .concat(["database/migrations"])
        .map((path) => `${path}/*.php`),
    itemsDefault: {},
});
