import { Command } from "../types.js";
import { forceOption } from "../options.js";

export const ChannelMakeCommand: Command = {
    name: "make:channel",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the channel",
        },
    ],
    options: [forceOption],
};
