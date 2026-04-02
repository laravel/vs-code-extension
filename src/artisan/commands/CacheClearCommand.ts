import { Command } from "../types";

export const CacheClearCommand: Command = {
    name: "cache:clear",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--tags",
            type: "input",
            description: "The cache tags you would like to clear",
        },
    ],
};
