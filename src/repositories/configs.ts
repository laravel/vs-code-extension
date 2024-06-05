import * as fs from "fs";
import { globSync } from "glob";
import * as vscode from "vscode";
import { Config, ConfigItem } from "..";
import { loadAndWatch } from "../support/fileWatcher";
import { info } from "../support/logger";
import { runInLaravel } from "../support/php";
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

const getFilePath = (key: string): vscode.Uri | undefined => {
    const path = projectPath(`config/${key}.php`);

    if (fs.existsSync(path)) {
        return vscode.Uri.file(path);
    }

    const files = globSync(projectPath(`vendor/**/config/${key}.php`));

    if (files.length > 0) {
        info(`Found config file for ${key} in vendor directory`, files[0]);
        return vscode.Uri.file(files[0]);
    }
};

const collectConfigs = (conf: Config, topLevel = false): ConfigItem[] => {
    // TODO: Boo?
    let result: any[] = [];

    let uri = undefined;

    for (let key in conf) {
        if (topLevel) {
            uri = getFilePath(key);

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

loadAndWatch(load, "config/{,*,**/*}.php");

export const getConfigs = (): ConfigItem[] => items;
