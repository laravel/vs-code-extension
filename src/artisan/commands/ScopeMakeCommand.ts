import { Command } from "../types.js";
import { forceOption } from "@src/artisan/options.js";

export const ScopeMakeCommand: Command = {
    name: "make:scope",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the scope",
        },
    ],
    options: [forceOption],
};
