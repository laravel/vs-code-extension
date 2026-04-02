import { Command } from "../types";

export const RouteListCommand: Command = {
    name: "route:list",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--json",
            description: "Output the route list as JSON",
        },
        {
            name: "--method",
            type: "input",
            description: "Filter the routes by method",
        },
        {
            name: "--action",
            type: "input",
            description: "Filter the routes by action",
        },
        {
            name: "--name",
            type: "input",
            description: "Filter the routes by name",
        },
        {
            name: "--domain",
            type: "input",
            description: "Filter the routes by domain",
        },
        {
            name: "--middleware",
            type: "input",
            description: "Filter the routes by middleware",
        },
        {
            name: "--path",
            type: "input",
            description: "Only show routes matching the given path pattern",
        },
        {
            name: "--except-path",
            type: "input",
            description:
                "Do not display the routes matching the given path pattern",
        },
        {
            name: "--reverse",
            description: "Reverse the ordering of the routes",
        },
        {
            name: "--sort",
            type: "select",
            options: () => ({
                domain: "domain",
                method: "method",
                uri: "uri",
                name: "name",
                action: "action",
                middleware: "middleware",
                definition: "definition",
            }),
            description: "The column to sort by",
        },
        {
            name: "--except-vendor",
            description: "Do not display routes defined by vendor packages",
            excludeIf: ["--only-vendor"],
        },
        {
            name: "--only-vendor",
            description: "Only display routes defined by vendor packages",
            excludeIf: ["--except-vendor"],
        },
    ],
};
