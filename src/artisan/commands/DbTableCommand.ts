import { Command } from "../types";

export const DbTableCommand: Command = {
    name: "db:table",
    arguments: [
        {
            name: "table",
            description: "The name of the table",
        },
    ],
    postRun: "none",
    runIn: "terminal",
    options: [
        {
            name: "--database",
            type: "input",
            description: "The database connection",
        },
        {
            name: "--json",
            description: "Output the table information as JSON",
        },
    ],
};
