import { Command } from "../types";

export const KeyGenerateCommand: Command = {
    name: "key:generate",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--show",
            description: "Display the key instead of modifying files",
        },
        {
            name: "--force",
            description: "Force the operation to run when in production",
        },
    ],
};
