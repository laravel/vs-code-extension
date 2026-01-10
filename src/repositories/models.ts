import { repository } from ".";
import { Eloquent } from "..";
import { writeEloquentDocBlocks } from "../support/docblocks";
import { runInLaravel, template } from "./../support/php";
import { escapeNamespace } from "../support/util";

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

export const getModels = repository<Eloquent.Models>({
    load,
    pattern: modelPaths
        .concat(["database/migrations"])
        .map((path) => `${path}/*.php`),
    itemsDefault: {},
});

export const getModelClassnames = (): Record<string, string> => {
    return Object.fromEntries(
        Object.entries(getModels().items).map(([_, model]) => [
            model.class,
            escapeNamespace(model.class),
        ]),
    );
};
