import { Command } from "../types.js";
import { forceOption } from "@src/artisan/options.js";

export const MiddlewareMakeCommand: Command = {
    name: "make:middleware",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the middleware",
        },
    ],
    options: [forceOption],
};
