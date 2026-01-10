import { Command } from "../types";

export const MigrationMakeCommand: Command = {
    name: "make:migration",
    arguments: [
        {
            name: "name",
            type: "path",
            description: "The name of the migration",
        },
    ],
    options: [
        {
            name: "--create",
            type: "input",
            description: "The table to be created",
            excludeIf: ["--table"],
        },
        {
            name: "--table",
            type: "input",
            description: "The table to migrate",
            excludeIf: ["--create"],
        },
    ],
};
