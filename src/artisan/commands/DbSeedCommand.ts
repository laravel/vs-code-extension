import { Command } from "../types";

export const DbSeedCommand: Command = {
    name: "db:seed",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--class",
            type: "input",
            default: "Database\\Seeders\\DatabaseSeeder",
            description: "The class name of the root seeder",
        },
        {
            name: "--database",
            type: "input",
            description: "The database connection to seed",
        },
        {
            name: "--force",
            description: "Force the operation to run when in production",
        },
    ],
};
