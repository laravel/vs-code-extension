import { Command } from "../types";

export const QueueFlushCommand: Command = {
    name: "queue:flush",
    arguments: [],
    postRun: "none",
    runIn: "terminal",
    options: [
        {
            name: "--hours",
            type: "input",
            description: "The number of hours to retain failed job data",
        },
    ],
};
