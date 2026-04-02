import { Command } from "../types";

export const ScheduleListCommand: Command = {
    name: "schedule:list",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--timezone",
            type: "input",
            description: "The timezone that times should be displayed in",
        },
        {
            name: "--next",
            description: "Sort the listed tasks by their next due date",
        },
        {
            name: "--json",
            description: "Output the scheduled tasks as JSON",
        },
    ],
};
