import { Command } from "../types";
import { forceOption } from "@src/artisan/options";

export const EventMakeCommand: Command = {
    name: "make:event",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the event",
        },
    ],
    options: [forceOption],
};
