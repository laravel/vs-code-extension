import * as fs from "fs";
import { globSync } from "glob";
import * as vscode from "vscode";
import { repository } from ".";
import { Config, ConfigItem } from "..";
import { runInLaravel } from "../support/php";
import { projectPath } from "../support/project";

let cachedFilePaths = new Map<string, vscode.Uri | undefined>();

const getFilePath = (key: string): vscode.Uri | undefined => {
    const path = projectPath(`config/${key}.php`);

    if (fs.existsSync(path)) {
        return vscode.Uri.file(path);
    }

    const files = globSync(projectPath(`vendor/**/config/${key}.php`));

    if (files.length > 0) {
        return vscode.Uri.file(files[0]);
    }
};

const collectConfigs = (conf: Config, topLevel = false): ConfigItem[] => {
    let result: ConfigItem[] = [];

    let uri = undefined;

    for (let key in conf) {
        if (topLevel) {
            uri = getFilePath(key);

            cachedFilePaths.set(key, uri);
        }

        const val = getConfigValue(conf, key, uri);

        if (val instanceof Array) {
            result.push(...val.filter((c) => Number.isNaN(parseInt(c.name))));
        } else {
            if (Number.isNaN(parseInt(val.name))) {
                result.push(val);
            }
        }
    }

    return result.flat();
};

const getConfigValue = (
    conf: Config,
    key: string,
    uri: vscode.Uri | undefined,
): ConfigItem | ConfigItem[] => {
    if (conf[key] instanceof Object) {
        return [{ name: key, value: "array(...)", uri }].concat(
            collectConfigs(conf[key]).map((c) => ({
                ...c,
                uri: uri || cachedFilePaths.get(key),
                name: `${key}.${c.name}`,
            })),
        );
    }

    return {
        name: key,
        value: conf[key] instanceof Array ? "array(...)" : conf[key],
        uri: uri || cachedFilePaths.get(key),
    };
};

export const getConfigs = repository<ConfigItem[]>(
    () => {
        return runInLaravel<Config>(
            "echo json_encode(config()->all());",
            "Configs",
        ).then((result) => collectConfigs(result, true));
    },
    ["config/{,*,**/*}.php", ".env"],
    [],
);
