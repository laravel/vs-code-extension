import { Command } from "../types";

export const AuthClearResetsCommand: Command = {
    name: "auth:clear-resets",
    arguments: [],
    postRun: "none",
    runIn: "terminal",
};
