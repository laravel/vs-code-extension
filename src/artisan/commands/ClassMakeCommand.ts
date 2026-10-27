import { Command } from "../types.js";

export const ClassMakeCommand: Command = {
    name: "make:class",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the class",
        },
    ],
    options: [
        {
            name: "--invokable",
            description: "Generate a single method, invokable class",
        },
    ],
};
