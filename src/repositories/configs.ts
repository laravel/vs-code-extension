import * as fs from "fs";
import * as vscode from "vscode";
import { Config, ConfigItem } from "..";
import { runInLaravel } from "../PHP";
import { createFileWatcher } from "../support/fileWatcher";
import { projectPath } from "../support/project";

let items: ConfigItem[] = [];
let cachedFilePaths = new Map<string, vscode.Uri | undefined>();

const load = () => {
    runInLaravel<Config>("echo json_encode(config()->all());", "Configs")
        .then((result) => {
            items = collectConfigs(result, true);
        })
        .catch(function (exception) {
            console.error(exception);
        });
};

const collectConfigs = (conf: Config, topLevel = false): ConfigItem[] => {
    // TODO: Boo?
    let result: any[] = [];

    let uri = undefined;

    for (let key in conf) {
        if (topLevel) {
            let path = projectPath(`config/${key}.php`);
            uri = fs.existsSync(path) ? vscode.Uri.file(path) : undefined;

            cachedFilePaths.set(key, uri);
        }

        result.push(getConfigValue(conf, key, uri));
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

load();

createFileWatcher("config/{,*,**/*}.php", load);

export const getConfigs = (): ConfigItem[] => items;
