import { projectPathExists, readFileInProject } from "@src/support/project";
import * as vscode from "vscode";
import { repository } from ".";

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

const load = (workspaceFolder: vscode.WorkspaceFolder) => {
    let items: EnvItem = {};

    if (!projectPathExists(".env", workspaceFolder)) {
        return items;
    }

    readFileInProject(".env", workspaceFolder)
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

export const getEnv = repository<EnvItem>({
    load: (workspaceFolder: vscode.WorkspaceFolder) =>
        new Promise<EnvItem>((resolve, reject) => {
            try {
                resolve(load(workspaceFolder));
            } catch (error) {
                reject(error);
            }
        }),
    pattern: ".env",
    itemsDefault: {},
    reloadOnComposerChanges: false,
});
