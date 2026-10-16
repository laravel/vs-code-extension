import { Command } from "../types.js";
import { forceOption } from "@src/artisan/options.js";

export const InterfaceMakeCommand: Command = {
    name: "make:interface",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the interface",
        },
    ],
    options: [forceOption],
};
