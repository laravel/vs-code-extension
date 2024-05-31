"use strict";

import * as vscode from "vscode";
import Helpers from "./helpers";
import { runInLaravel } from "./PHP";
import { createFileWatcher } from "./fileWatcher";

type Config = {
    [key: string]: any;
};

type ConfigItem = {
    name: string;
    value: string;
};

export default class ConfigProvider implements vscode.CompletionItemProvider {
    private configs: ConfigItem[] = [];

    constructor() {
        this.load();

        createFileWatcher("config/{,*,**/*}.php", this.load.bind(this));
    }

    static tags(): Tags {
        return { classes: ["Config"], functions: ["config"] };
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        let func = Helpers.parseDocumentFunction(document, position);

        if (func === null) {
            return [];
        }

        if (
            (func.class &&
                ConfigProvider.tags().classes.some((cls: string) =>
                    func.class.includes(cls),
                )) ||
            ConfigProvider.tags().functions.some((fn: string) =>
                func.function.includes(fn),
            )
        ) {
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

        return [];
    }

    load() {
        runInLaravel("echo json_encode(config()->all());", "Configs")
            .then((result) => {
                if (result) {
                    this.configs = this.getConfigs(JSON.parse(result));
                }
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
