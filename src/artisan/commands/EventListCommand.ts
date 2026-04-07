import { Command } from "../types";

export const EventListCommand: Command = {
    name: "event:list",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--event",
            type: "input",
            description: "Filter the events by name",
        },
        {
            name: "--json",
            description: "Output the events and listeners as JSON",
        },
    ],
};
