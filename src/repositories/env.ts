import { repository } from ".";
import { projectPathExists, readFileInProject } from "../support/project";

interface EnvItem {
    [key: string]: {
        value: string;
        lineNumber: number;
    };
}

const getKeyValue = (str: string) => {
    const parts = str.split("=").map((env) => env.trim());

    return [parts[0], parts.slice(1).join("=")];
};

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
            line: getKeyValue(env.line),
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
