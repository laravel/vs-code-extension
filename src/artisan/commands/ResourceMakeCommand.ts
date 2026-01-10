import { Command } from "../types";

export const ResourceMakeCommand: Command = {
    name: "make:resource",
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
