import { Command } from "../types";

export const SchemaDumpCommand: Command = {
    name: "schema:dump",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--database",
            type: "input",
            description: "The database connection to use",
        },
        {
            name: "--path",
            type: "input",
            description: "The path where the schema dump file should be stored",
        },
        {
            name: "--prune",
            description: "Delete all existing migration files",
        },
    ],
};
