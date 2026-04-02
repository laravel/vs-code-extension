import { Command } from "../types";

export const QueueFailedCommand: Command = {
    name: "queue:failed",
    arguments: [],
    postRun: "none",
    runIn: "terminal",
};
