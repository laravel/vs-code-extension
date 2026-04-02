import { Command } from "../types";

export const VendorPublishCommand: Command = {
    name: "vendor:publish",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--existing",
            description:
                "Publish and overwrite only the files that have already been published",
        },
        {
            name: "--force",
            description: "Overwrite any existing files",
        },
        {
            name: "--all",
            description:
                "Publish assets for all service providers without prompt",
        },
        {
            name: "--provider",
            type: "input",
            description:
                "The service provider that has assets you want to publish",
        },
        {
            name: "--tag",
            type: "input",
            description:
                "One or many tags that have assets you want to publish",
        },
    ],
};
