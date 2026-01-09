import { Command } from "../types";

export const EnumMakeCommand: Command = {
    name: "make:enum",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the enum",
        },
    ],
    options: [
        {
            name: "--string",
            description: "Generate a string backed enum.",
            excludeIf: ["--int"],
        },
        {
            name: "--int",
            description: "Generate an integer backed enum.",
            excludeIf: ["--string"],
        },
    ],
};
