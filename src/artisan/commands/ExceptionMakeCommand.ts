import { Command } from "../types";

export const ExceptionMakeCommand: Command = {
    name: "make:exception",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the exception",
        },
    ],
    options: [
        {
            name: "--render",
            description: "Create the exception with an empty render method",
        },
        {
            name: "--report",
            description: "Create the exception with an empty report method",
        },
    ],
};
