import { Command } from "../types";

export const PailCommand: Command = {
    name: "pail",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--filter",
            type: "input",
            description: "Filter the logs by the given value",
        },
        {
            name: "--message",
            type: "input",
            description: "Filter the logs by the given message",
        },
        {
            name: "--level",
            type: "input",
            description: "Filter the logs by the given level",
        },
        {
            name: "--auth",
            type: "input",
            description: "Filter the logs by the given authenticated ID",
        },
        {
            name: "--user",
            type: "input",
            description: "Filter the logs by the given authenticated ID",
        },
        {
            name: "--timeout",
            type: "input",
            default: "3600",
            description: "The maximum execution time in seconds",
        },
    ],
};
