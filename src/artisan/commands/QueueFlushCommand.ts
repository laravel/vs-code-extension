import { Command } from "../types";

export const QueueFlushCommand: Command = {
    name: "queue:flush",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--hours",
            type: "input",
            description: "The number of hours to retain failed job data",
        },
    ],
};
