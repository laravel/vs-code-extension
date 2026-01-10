import { Command } from "../types";
import { forceOption, testOptions } from "@src/artisan/options";

export const ModelMakeCommand: Command = {
    name: "make:model",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the model",
        },
    ],
    options: [
        {
            name: "--all",
            description:
                "Generate a migration, seeder, factory, policy, resource controller, and form request classes for the model",
        },
        {
            name: "--controller",
            description: "Create a new controller for the model",
        },
        {
            name: "--factory",
            description: "Create a new factory for the model",
        },
        {
            name: "--migration",
            description: "Create a new migration file for the model",
        },
        {
            name: "--morph-pivot",
            description:
                "Indicates if the generated model should be a custom polymorphic intermediate table model",
            excludeIf: ["--pivot"],
        },
        {
            name: "--policy",
            description: "Create a new policy for the model",
        },
        {
            name: "--seed",
            description: "Create a new seeder for the model",
        },
        {
            name: "--pivot",
            description:
                "Indicates if the generated model should be a custom intermediate table model",
            excludeIf: ["--morph-pivot"],
        },
        {
            name: "--resource",
            description:
                "Indicates if the generated controller should be a resource controller",
            excludeIf: ["--api"],
        },
        {
            name: "--api",
            description:
                "Indicates if the generated controller should be an API resource controller",
            excludeIf: ["--resource"],
        },
        {
            name: "--requests",
            description:
                "Create new form request classes and use them in the resource controller",
        },
        ...testOptions,
        forceOption,
    ],
};
