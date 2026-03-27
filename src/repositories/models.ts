import * as vscode from "vscode";
import { repository } from ".";
import { Eloquent } from "..";
import { writeEloquentDocBlocks } from "../support/docblocks";
import { escapeNamespace } from "../support/util";
import { runInLaravel, template } from "./../support/php";

const modelPaths = ["app", "app/Models"];

const load = (workspaceFolder: vscode.WorkspaceFolder) => {
    return runInLaravel<Eloquent.Result>(
        template("models", {
            model_paths: JSON.stringify(modelPaths),
        }),
        workspaceFolder,
        "Eloquent Attributes and Relations",
    ).then((result) => {
        if (!result) {
            return {};
        }

        writeEloquentDocBlocks(
            result.models,
            result.builderMethods,
            workspaceFolder,
        );

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
