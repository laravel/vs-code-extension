import { Command } from "../types";

export const MigrateStatusCommand: Command = {
    name: "migrate:status",
    runIn: "terminal",
    arguments: [],
    options: [
        {
            name: "--database",
            type: "input",
            description: "The database connection to use",
        },
        {
            name: "--pending",
            description: "Dump information about pending migrations",
        },
        {
            name: "--path",
            type: "input",
            description: "The path(s) to the migrations files to use",
        },
        {
            name: "--realpath",
            description:
                "Indicate any provided migration file paths are pre-resolved absolute paths",
        },
    ],
};
