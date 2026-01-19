import { Command } from "../types";
import { forceOption } from "@src/artisan/options";

export const TraitMakeCommand: Command = {
    name: "make:trait",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the trait",
        },
    ],
    options: [forceOption],
};
