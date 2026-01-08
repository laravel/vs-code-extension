import { Command } from "../types";
import { forceOption, testOptions } from "../options";

export const CommandMakeCommand: Command = {
    name: "make:command",
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
