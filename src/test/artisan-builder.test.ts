import * as assert from "assert";
import * as vscode from "vscode";

import { artisanBuilderUi, buildArtisanCommand } from "../artisan/builder";
import { ModelMakeCommand } from "../artisan/commands/ModelMakeCommand";
import { Command } from "../artisan/types";
import { uri } from "./helper";

const originalUi = { ...artisanBuilderUi };

const ControllerMakeCommand: Command = {
    name: "make:controller",
    arguments: [{ name: "name", type: "namespace" }],
};

const build = (command: Command, folder: string, name: string) => {
    artisanBuilderUi.showInputBox = async () => name;
    artisanBuilderUi.showQuickPick = (async (items: any) =>
        (await items)[0]) as typeof artisanBuilderUi.showQuickPick;

    return buildArtisanCommand(
        command,
        uri(folder),
        vscode.workspace.workspaceFolders![0],
    );
};

suite("Artisan Builder Test Suite", () => {
    teardown(() => {
        Object.assign(artisanBuilderUi, originalUi);
    });

    test("passes make:model a name relative to app/Models", async () => {
        assert.deepStrictEqual(
            await build(ModelMakeCommand, "app/Models", "Post"),
            ["make:model", "Post"],
        );
    });

    test("keeps the subfolder of app/Models in the make:model name", async () => {
        assert.deepStrictEqual(
            await build(ModelMakeCommand, "app/Models/Blog", "Post"),
            ["make:model", "Blog\\Post"],
        );

        assert.deepStrictEqual(
            await build(ModelMakeCommand, "app/Models", "Blog/Post"),
            ["make:model", "Blog\\Post"],
        );
    });

    test("keeps the full namespace for a model outside app/Models", async () => {
        assert.deepStrictEqual(
            await build(ModelMakeCommand, "app/Concerns", "Post"),
            ["make:model", "App\\Concerns\\Post"],
        );

        assert.deepStrictEqual(
            await build(ModelMakeCommand, "app/ModelsExtra", "Post"),
            ["make:model", "App\\ModelsExtra\\Post"],
        );
    });

    test("passes other make commands the full namespace", async () => {
        assert.deepStrictEqual(
            await build(
                ControllerMakeCommand,
                "app/Http/Controllers",
                "PostController",
            ),
            ["make:controller", "App\\Http\\Controllers\\PostController"],
        );
    });
});
