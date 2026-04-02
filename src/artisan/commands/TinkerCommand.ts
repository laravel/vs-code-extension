import { Command } from "../types";

export const TinkerCommand: Command = {
    name: "tinker",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--execute",
            type: "input",
            description: "Execute the given code using Tinker",
        },
    ],
};
