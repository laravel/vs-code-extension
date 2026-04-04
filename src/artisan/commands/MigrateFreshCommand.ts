import { Command } from "../types";

export const MigrateFreshCommand: Command = {
    name: "migrate:fresh",
    runIn: "terminal",
    confirmation: {
        message: "This will drop all tables and re-run all migrations.",
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
            name: "--schema-path",
            type: "input",
            description: "The path to a schema dump file",
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
            name: "--drop-views",
            description: "Drop all tables and views",
        },
        {
            name: "--drop-types",
            description: "Drop all tables and types (Postgres only)",
        },
        {
            name: "--step",
            description:
                "Force the migrations to be run so they can be rolled back individually",
        },
    ],
};
