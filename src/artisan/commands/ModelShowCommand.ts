import { Command } from "../types";

export const ModelShowCommand: Command = {
    name: "model:show",
    arguments: [
        {
            name: "model",
            description: "The model to show",
        },
    ],
    runIn: "terminal",
    options: [
        {
            name: "--database",
            type: "input",
            description: "The database connection to use",
        },
        {
            name: "--json",
            description: "Output the model as JSON",
        },
    ],
};
