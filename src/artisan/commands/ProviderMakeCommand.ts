import { Command } from "../types";
import { forceOption } from "@src/artisan/options";

export const ProviderMakeCommand: Command = {
    name: "make:provider",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the service provider",
        },
    ],
    options: [forceOption],
};
