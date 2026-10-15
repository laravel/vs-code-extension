import { getModelClassnames } from "@src/lsp/models";
import { Command } from "../types";

export const FactoryMakeCommand: Command = {
    name: "make:factory",
    postRun: "openGeneratedFile",
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
