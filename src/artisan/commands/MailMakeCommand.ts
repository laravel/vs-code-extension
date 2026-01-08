import { Command } from "../types";
import { kebab } from "@src/support/str";
import { forceOption, testOptions } from "@src/artisan/options";

export const MailMakeCommand: Command = {
    name: "make:mail",
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
