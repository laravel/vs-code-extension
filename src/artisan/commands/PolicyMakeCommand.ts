import { Command } from "../types";
import { getModelClassnames } from "@src/repositories/models";

export const PolicyMakeCommand: Command = {
    name: "make:policy",
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
