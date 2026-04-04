import { Command } from "../types";
import { forceOption } from "../options";

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
