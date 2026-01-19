import { Command } from "../types";
import { getModelClassnames } from "@src/repositories/models";
import { forceOption, testOptions } from "@src/artisan/options";

export const ControllerMakeCommand: Command = {
    name: "make:controller",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the controller",
        },
    ],
    options: [
        {
            name: "--resource",
            description: "Generate a resource controller class",
            excludeIf: ["--invokable", "--api", "--singleton", "--creatable"],
        },
        {
            name: "--singleton",
            description: "Generate a singleton resource controller class",
            excludeIf: ["--invokable", "--api", "--resource"],
        },
        {
            name: "--api",
            description:
                "Exclude the create and edit methods from the controller",
            excludeIf: [
                "--invokable",
                "--resource",
                "--singleton",
                "--creatable",
            ],
        },
        {
            name: "--invokable",
            description: "Generate a single method, invokable class",
            excludeIf: [
                "--model",
                "--api",
                "--resource",
                "--singleton",
                "--creatable",
            ],
        },
        {
            name: "--creatable",
            description:
                "Indicate that a singleton resource should be creatable",
            excludeIf: ["--invokable", "--api", "--resource"],
        },
        {
            name: "--model",
            type: "select",
            options: () => getModelClassnames(),
            description: "Generate a resource controller for the given model",
            excludeIf: ["--invokable"],
        },
        {
            name: "--requests",
            description: "Generate FormRequest classes for store and update",
        },
        ...testOptions,
        forceOption,
    ],
};
