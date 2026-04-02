import { Command } from "../types";

export const QueueClearCommand: Command = {
    name: "queue:clear",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--queue",
            type: "input",
            description: "The name of the queue to clear",
        },
        {
            name: "--force",
            description: "Force the operation to run when in production",
        },
    ],
};
