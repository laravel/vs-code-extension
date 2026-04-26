import { Command } from "../types";
import { forceOption, testOptions } from "@src/artisan/options";
import { getViewKeys } from "@src/repositories/views";

export const ViewMakeCommand: Command = {
    name: "make:view",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "path",
            description: "The name of the view",
        },
    ],
    options: [
        {
            name: "--extends",
            type: "select",
            options: () => getViewKeys(),
            description: "The parent view to extend",
        },
        ...testOptions,
        forceOption,
    ],
};
