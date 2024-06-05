import { loadAndWatch } from "../support/fileWatcher";
import { projectPathExists, readFileInProject } from "../support/project";

let items: {
    [key: string]: {
        value: string;
        lineNumber: number;
    };
} = {};

const load = () => {
    try {
        if (!projectPathExists(".env")) {
            return;
        }

        readFileInProject(".env")
            .split("\n")
            .map((env, index) => ({
                line: env.trim(),
                index,
            }))
            .filter((env) => !env.line.startsWith("#"))
            .map((env) => ({
                line: env.line.split("=").map((env) => env.trim()),
                index: env.index,
            }))
            .filter((env) => env.line.length === 2)
            .forEach((env) => {
                const [key, value] = env.line;

                items[key] = {
                    value,
                    lineNumber: env.index + 1,
                };
            });
    } catch (exception) {
        console.error(exception);
    }
};

loadAndWatch(load, ".env");

export const getEnv = () => items;
