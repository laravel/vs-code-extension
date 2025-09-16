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

export const getModelByClassname = (
    className: string,
): Eloquent.Model | undefined => {
    return getModels().items[className];
};

export const getModels = repository<Eloquent.Models>({
    load,
    pattern: modelPaths
        .concat(["database/migrations"])
        .map((path) => `${path}/*.php`),
    itemsDefault: {},
});
