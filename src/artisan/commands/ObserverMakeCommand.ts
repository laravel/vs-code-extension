import { Command } from "../types";
import { getModelClassnames } from "@src/repositories/models";

export const ObserverMakeCommand: Command = {
    name: "make:observer",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the observer",
        },
    ],
    options: [
        {
            name: "--model",
            type: "select",
            options: () => getModelClassnames(),
            description: "The model that the observer applies to",
        },
    ],
};
