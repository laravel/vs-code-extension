import { repository } from ".";
import { projectPathExists, readFileInProject } from "../support/project";

interface EnvItem {
    [key: string]: {
        value: string;
        lineNumber: number;
    };
}

const load = () => {
    let items: EnvItem = {};

    if (!projectPathExists(".env")) {
        return items;
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

    return items;
};

export const getEnv = repository<EnvItem>(
    () =>
        new Promise<EnvItem>((resolve, reject) => {
            try {
                resolve(load());
            } catch (error) {
                reject(error);
            }
        }),
    ".env",
    {},
);
