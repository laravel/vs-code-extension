import { Command } from "../types";

export const DbWipeCommand: Command = {
    name: "db:wipe",
    arguments: [],
    runIn: "terminal",
    confirmation: {
        message: "This will drop all tables, views, and types.",
    },
    options: [
        {
            name: "--database",
            type: "input",
            description: "The database connection to use",
        },
        {
            name: "--drop-views",
            description: "Drop all tables and views",
        },
        {
            name: "--drop-types",
            description: "Drop all tables and types (Postgres only)",
        },
        {
            name: "--force",
            description: "Force the operation to run when in production",
        },
    ],
};
