import { Command } from "../types.js";
import { forceOption, testOptions } from "@src/artisan/options.js";

export const NotificationMakeCommand: Command = {
    name: "make:notification",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the notification",
        },
    ],
    options: [
        {
            name: "--markdown",
            description: "Create a new Markdown template for the notification",
        },
        ...testOptions,
        forceOption,
    ],
};
