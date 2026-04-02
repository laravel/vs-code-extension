import { Command } from "../types";

export const WayfinderGenerateCommand: Command = {
    name: "wayfinder:generate",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--path",
            type: "input",
            description: "The path where Wayfinder files should be generated",
        },
        {
            name: "--skip-actions",
            description: "Skip generating action methods",
        },
        {
            name: "--skip-routes",
            description: "Skip generating route helpers",
        },
        {
            name: "--with-form",
            description: "Generate form helpers",
        },
    ],
};
