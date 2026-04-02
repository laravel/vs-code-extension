import { Command } from "../types";
import { forceOption } from "@src/artisan/options";

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
