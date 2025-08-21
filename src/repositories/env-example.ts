import { projectPathExists, readFileInProject } from "@src/support/project";
import { repository } from ".";

const filename = ".env.example";

interface EnvItem {
    [key: string]: {
        value: string;
        lineNumber: number;
    };
}

const load = () => {
    let items: EnvItem = {};

    if (!projectPathExists(filename)) {
        return items;
    }

    readFileInProject(filename)
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

export const getEnvExample = repository<EnvItem>({
    load: () =>
        new Promise<EnvItem>((resolve, reject) => {
            try {
                resolve(load());
            } catch (error) {
                reject(error);
            }
        }),
    pattern: filename,
    itemsDefault: {},
    reloadOnComposerChanges: false,
});
