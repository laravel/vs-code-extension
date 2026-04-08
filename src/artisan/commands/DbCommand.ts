import { Command } from "../types";

export const DbCommand: Command = {
    name: "db",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--read",
            description: "Connect to the read connection",
            excludeIf: ["--write"],
        },
        {
            name: "--write",
            description: "Connect to the write connection",
            excludeIf: ["--read"],
        },
    ],
};
