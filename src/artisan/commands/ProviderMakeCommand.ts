import { Command } from "../types.js";
import { forceOption } from "@src/artisan/options.js";

export const ProviderMakeCommand: Command = {
    name: "make:provider",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the service provider",
        },
    ],
    options: [forceOption],
};
