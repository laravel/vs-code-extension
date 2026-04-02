import { Command } from "../types";

export const QueueRetryCommand: Command = {
    name: "queue:retry",
    arguments: [
        {
            name: "id",
            description: 'The ID of the failed job or "all" to retry all jobs',
        },
    ],
    runIn: "terminal",
    options: [
        {
            name: "--queue",
            type: "input",
            description: "Retry all of the failed jobs for the specified queue",
        },
        {
            name: "--range",
            type: "input",
            description: "Range of job IDs to be retried (e.g. 1-5)",
        },
    ],
};
