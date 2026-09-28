import { Command } from "../types.js";
import { forceOption } from "@src/artisan/options.js";

export const EventMakeCommand: Command = {
    name: "make:event",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the event",
        },
    ],
    options: [forceOption],
};
