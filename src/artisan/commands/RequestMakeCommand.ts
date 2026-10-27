import { Command } from "../types.js";
import { forceOption } from "@src/artisan/options.js";

export const RequestMakeCommand: Command = {
    name: "make:request",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the request",
        },
    ],
    options: [forceOption],
};
