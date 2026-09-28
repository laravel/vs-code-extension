import { Command } from "../types.js";
import { getModelClassnames } from "@src/lsp/models.js";

export const PolicyMakeCommand: Command = {
    name: "make:policy",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the policy",
        },
    ],
    options: [
        {
            name: "--model",
            type: "select",
            options: () => getModelClassnames(),
            description: "The model that the policy applies to",
        },
        {
            name: "--guard",
            type: "input",
            description: "The guard that the policy relies on",
        },
    ],
};
