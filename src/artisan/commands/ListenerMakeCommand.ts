import { Command } from "../types";
import { forceOption, testOptions } from "@src/artisan/options";

export const ListenerMakeCommand: Command = {
    name: "make:listener",
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
