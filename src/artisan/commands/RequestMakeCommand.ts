import { Command } from "../types";
import { forceOption } from "@src/artisan/options";

export const RequestMakeCommand: Command = {
    name: "make:request",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the request",
        },
    ],
    options: [forceOption],
};
