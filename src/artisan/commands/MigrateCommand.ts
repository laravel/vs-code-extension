import { Command } from "../types";

export const MigrateCommand: Command = {
    name: "migrate",
    runIn: "terminal",
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
            name: "--pretend",
            description: "Dump the SQL queries that would be run",
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
            description:
                "Force the migrations to be run so they can be rolled back individually",
        },
        {
            name: "--graceful",
            description:
                "Return a successful exit code even if an error occurs",
        },
        {
            name: "--isolated",
            description:
                "Do not run the command if another instance is already running",
        },
    ],
};
