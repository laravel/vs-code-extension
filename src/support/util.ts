import * as crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import * as vscode from "vscode";
import { relativePath } from "./project";

/**
 * Get indent space based on user configuration
 */
export const indent = (text: string = "", repeat: number = 1): string => {
    const editor = vscode.window.activeTextEditor;

    if (editor && editor.options.insertSpaces) {
        return " ".repeat(<number>editor.options.tabSize * repeat) + text;
    }

    return "\t" + text;
};

export const trimQuotes = (text: string): string =>
    text.substring(1, text.length - 1);

export const relativeMarkdownLink = (uri: vscode.Uri): string => {
    return `[${relativePath(uri.path)}](${uri})`;
};

export const toArray = <T>(value: T | T[]): T[] => {
    return Array.isArray(value) ? value : [value];
};

export const attribute = (className: string): string => {
    return `Illuminate\\Container\\Attributes\\${className}`;
};

export const contract = (className: string): string => {
    return `Illuminate\\Contracts\\${className}`;
};

export const facade = (className: string): string[] => {
    return [className, support(`Facades\\${className}`)];
};

export const support = (className: string): string => {
    return `Illuminate\\Support\\${className}`;
};

export const md5 = (string: string) => {
    const hash = crypto.createHash("md5");
    hash.update(string);
    return hash.digest("hex");
};

let tempDir: string;

export const tempPath = (...paths: string[]): string => {
    if (!tempDir) {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vscode-laravel"));
    }

    return path.join(tempDir, ...paths);
};

export const cleanUpTemp = () => {
    if (tempDir) {
        fs.rmdirSync(tempDir, { recursive: true });
    }
};

export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
): T => {
    let timeout: NodeJS.Timeout;

    return function (this: any, ...args: any[]) {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    } as T;
};

export const leadingDebounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
): T => {
    let timeout: NodeJS.Timeout;
    let lastInvocation = 0;

    return function (this: any, ...args: any[]) {
        clearTimeout(timeout);

        if (lastInvocation < Date.now() - wait) {
            // It's been a while since the last invocation, just call the function, no need to wait
            func.apply(this, args);
        } else {
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        }

        lastInvocation = Date.now();
    } as T;
};

export const waitForValue = <T>(
    value: () => T,
    interval = 100,
    maxAttempts = 20,
): Promise<T> =>
    new Promise((resolve) => {
        let attempts = 0;

        const checkForValue = () => {
            attempts++;

            if (attempts > maxAttempts) {
                return resolve(value());
            }

            if (value() === null) {
                return setTimeout(checkForValue, 100);
            }

            resolve(value());
        };

        checkForValue();
    });

export const createIndexMapping = (
    items: [string | string[], Record<string, number>][],
) => {
    const mapping: Record<string, Record<string, number>> = {};

    items.forEach(([keys, value]) => {
        keys = toArray(keys);

        keys.forEach((key) => {
            mapping[key] = value;
        });
    });

    return {
        mapping,
        get(className: string | null, methodName: string | null) {
            return mapping[className ?? ""][methodName ?? ""] ?? null;
        },
    };
};

export const escapeNamespace = (namespace: string): string => {
    if (
        ["linux", "openbsd", "sunos", "darwin"].some((unixPlatforms) =>
            os.platform().includes(unixPlatforms),
        )
    ) {
        // We need to escape backslashes because finally it will be a part of CLI command
        return namespace.replace(/(?<!\\)\\(?!\\)/g, "\\\\");
    }

    return namespace;
};
