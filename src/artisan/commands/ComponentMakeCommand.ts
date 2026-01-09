import { Command } from "../types";
import { forceOption, testOptions } from "../options";

export const ComponentMakeCommand: Command = {
    name: "make:component",
    arguments: [
        {
            name: "name",
            type: "namespaceOrPath",
            description: "The name of the component",
        },
    ],
    options: [
        {
            name: "--path",
            type: "input",
            default: "components",
            description:
                "The location where the component view should be created",
        },
        {
            name: "--inline",
            description: "Create a component that renders an inline view",
            excludeIf: ["--view"],
        },
        {
            name: "--view",
            description: "Create an anonymous component with only a view",
            excludeIf: ["--inline"],
        },
        ...testOptions,
        forceOption,
    ],
};
