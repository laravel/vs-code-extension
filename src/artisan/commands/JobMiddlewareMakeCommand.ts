import { Command } from "../types.js";
import { forceOption, testOptions } from "@src/artisan/options.js";

export const JobMiddlewareMakeCommand: Command = {
    name: "make:job-middleware",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the job middleware",
        },
    ],
    options: [...testOptions, forceOption],
};
