import { Command } from "../types";

export const QueueForgetCommand: Command = {
    name: "queue:forget",
    arguments: [
        {
            name: "id",
            description: "The ID of the failed job",
        },
    ],
    runIn: "terminal",
};
