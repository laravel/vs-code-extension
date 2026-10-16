import { Command } from "../types.js";
import { forceOption, testOptions } from "@src/artisan/options.js";

export const ListenerMakeCommand: Command = {
    name: "make:listener",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the listener",
        },
    ],
    options: [
        {
            name: "--queued",
            description: "Indicates that listener should be queued",
        },
        ...testOptions,
        forceOption,
    ],
};
