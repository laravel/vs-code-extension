"use strict";

import * as vscode from "vscode";
import Helpers from "./helpers";
import { runInLaravel } from "./PHP";
import { createFileWatcher } from "./fileWatcher";
import { CompletionItemFunction, Provider, Tags } from ".";

interface Config {
    [key: string]: any;
}

interface ConfigItem {
    name: string;
    value: string;
}

export default class ConfigProvider implements Provider {
    private configs: ConfigItem[] = [];

    constructor() {
        this.load();

        createFileWatcher("config/{,*,**/*}.php", this.load.bind(this));
    }

    tags(): Tags {
        return { classes: ["Config"], functions: ["config"] };
    }

    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        return this.configs.map((config) => {
            let completeItem = new vscode.CompletionItem(
                config.name,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                Helpers.wordMatchRegex,
            );

            if (config.value) {
                completeItem.detail = config.value.toString();
            }

            return completeItem;
        });
    }

    load() {
        runInLaravel<Config>("echo json_encode(config()->all());", "Configs")
            .then((result) => {
                this.configs = this.getConfigs(result);
            })
            .catch(function (exception) {
                console.error(exception);
            });
    }

    getConfigs(conf: Config): ConfigItem[] {
        // TODO: Boo?
        let result: any[] = [];

        for (let key in conf) {
            result.push(this.getConfigValue(conf, key));
        }

        return result.flat();
    }

    getConfigValue(conf: Config, key: string): ConfigItem | ConfigItem[] {
        if (conf[key] instanceof Array) {
            return { name: key, value: "array(...)" };
        }

        if (conf[key] instanceof Object) {
            return [{ name: key, value: "array(...)" }].concat(
                this.getConfigs(conf[key]).map((c) => ({
                    ...c,
                    name: `${key}.${c.name}`,
                })),
            );
        }

        return { name: key, value: conf[key] };
    }
}
