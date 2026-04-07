import { Command } from "../types";

export const MigrateRollbackCommand: Command = {
    name: "migrate:rollback",
    runIn: "terminal",
    confirmation: {
        message: "This will roll back the latest database migrations.",
    },
    arguments: [],
    options: [
        {
            name: "--database",
            type: "input",
            description: "The database connection to use",
        },
        {
            name: "--force",
            description: "Force the operation to run in production",
        },
        {
            name: "--step",
            type: "input",
            description: "The number of migrations to be reverted",
        },
        {
            name: "--batch",
            type: "input",
            description: "The batch of migrations to be reverted",
        },
        {
            name: "--path",
            type: "input",
            description: "The path(s) to the migrations files to be executed",
        },
        {
            name: "--realpath",
            description:
                "Indicate any provided migration file paths are pre-resolved absolute paths",
        },
        {
            name: "--pretend",
            description: "Dump the SQL queries that would be run",
        },
    ],
};
