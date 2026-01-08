import { Command } from "../types";
import { forceOption, testOptions } from "@src/artisan/options";

export const JobMiddlewareMakeCommand: Command = {
    name: "make:job-middleware",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the job middleware",
        },
    ],
    options: [...testOptions, forceOption],
};
