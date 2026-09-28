import { Command } from "../types.js";
import { forceOption, testOptions } from "../options.js";

export const CommandMakeCommand: Command = {
    name: "make:command",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the command",
        },
    ],
    options: [
        {
            name: "--command",
            type: "input",
            description:
                "The terminal command that will be used to invoke the class",
        },
        ...testOptions,
        forceOption,
    ],
};
