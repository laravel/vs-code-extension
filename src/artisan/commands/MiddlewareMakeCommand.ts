import { Command } from "../types";
import { forceOption } from "@src/artisan/options";

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
