import { Command } from "../types.js";
import { kebab } from "@src/support/str.js";
import { forceOption, testOptions } from "@src/artisan/options.js";

export const MailMakeCommand: Command = {
    name: "make:mail",
    postRun: "openGeneratedFile",
    arguments: [
        {
            name: "name",
            type: "namespace",
            description: "The name of the mail",
        },
    ],
    options: [
        {
            name: "--markdown",
            description: "Create a new Markdown template for the mailable",
            type: "input",
            default: (name: string): string =>
                kebab(
                    name.replaceAll("\\\\", "/").split("/").slice(-2).join("/"),
                ),
            excludeIf: ["--view"],
        },
        {
            name: "--view",
            description: "Create a new Blade template for the mailable",
            type: "input",
            default: (name: string): string =>
                kebab(
                    name.replaceAll("\\\\", "/").split("/").slice(-2).join("/"),
                ),
            excludeIf: ["--markdown"],
        },
        ...testOptions,
        forceOption,
    ],
};
