import { Command } from "../types";
import { getModelClassnames } from "@src/repositories/models";

export const FactoryMakeCommand: Command = {
    name: "make:factory",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the factory",
        },
    ],
    options: [
        {
            name: "--model",
            type: "select",
            options: () => getModelClassnames(),
            description: "The name of the model",
        },
    ],
};
