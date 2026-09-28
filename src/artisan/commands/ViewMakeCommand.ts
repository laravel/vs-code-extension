import { Command } from "../types.js";
import { forceOption, testOptions } from "@src/artisan/options.js";

export const ViewMakeCommand: Command = {
    name: "make:view",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "path",
            description: "The name of the view",
        },
    ],
    options: [...testOptions, forceOption],
};
