import { Command } from "../types";
import { forceOption, testOptions } from "@src/artisan/options";

export const LivewireMakeCommand: Command = {
    name: "make:livewire",
    arguments: [
        {
            name: "name",
            type: "path",
            description: "The name of the Livewire component",
        },
    ],
    options: [
        {
            name: "--inline",
            description: "Create a component that renders an inline view",
        },
        ...testOptions,
        forceOption,
    ],
};
