import { Command } from "../types.js";
import { getModelClassnames } from "@src/lsp/models.js";

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
