import { Command } from "../types";
import { forceOption, testOptions } from "@src/artisan/options";

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
