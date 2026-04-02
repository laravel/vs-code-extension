import { Command } from "../types";

export const PestDatasetCommand: Command = {
    name: "pest:dataset",
    arguments: [
        {
            name: "name",
            type: "path",
            description: "The name of the dataset",
        },
    ],
    runIn: "terminal",
    options: [
        {
            name: "--test-directory",
            type: "input",
            default: "tests",
            description: "The name of the tests directory",
        },
    ],
};
