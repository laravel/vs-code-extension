import { Command } from "../types";

export const DbShowCommand: Command = {
    name: "db:show",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--database",
            type: "input",
            description: "The database connection",
        },
        {
            name: "--json",
            description: "Output the database information as JSON",
        },
        {
            name: "--counts",
            description: "Show the table row count",
        },
        {
            name: "--views",
            description: "Show the database views",
        },
        {
            name: "--types",
            description: "Show the user defined types",
        },
    ],
};
