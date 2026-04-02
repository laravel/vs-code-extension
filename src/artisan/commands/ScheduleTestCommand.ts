import { Command } from "../types";

export const ScheduleTestCommand: Command = {
    name: "schedule:test",
    arguments: [],
    runIn: "terminal",
    options: [
        {
            name: "--name",
            type: "input",
            description: "The name of the scheduled command to run",
        },
    ],
};
