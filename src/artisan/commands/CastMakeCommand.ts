import { Command } from "../types";

export const CastMakeCommand: Command = {
    name: "make:cast",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the cast class",
        },
    ],
    options: [
        {
            name: "--inbound",
            description: "Generate an inbound cast class",
        },
    ],
};
