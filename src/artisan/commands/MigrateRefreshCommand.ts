import { Command } from "../types";

export const MigrateRefreshCommand: Command = {
    name: "migrate:refresh",
    runIn: "terminal",
    confirmation: {
        message: "This will roll back and re-run migrations.",
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
            name: "--seed",
            description: "Indicates if the seed task should be re-run",
        },
        {
            name: "--seeder",
            type: "input",
            description: "The class name of the root seeder",
        },
        {
            name: "--step",
            type: "input",
            description: "The number of migrations to be reverted and re-run",
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
    ],
};
