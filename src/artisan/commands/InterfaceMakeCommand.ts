import { Command } from "../types";
import { forceOption } from "@src/artisan/options";

export const InterfaceMakeCommand: Command = {
    name: "make:interface",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the interface",
        },
    ],
    options: [forceOption],
};
