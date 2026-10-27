import { Command } from "../types.js";

export const ResourceMakeCommand: Command = {
    name: "make:resource",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the resource",
        },
    ],
    options: [
        {
            name: "--collection",
            description: "Create a resource collection",
        },
    ],
};
