import * as vscode from "vscode";
import { repository } from ".";
import { Config, ConfigItem } from "..";
import { runInLaravel, template } from "../support/php";

export const getConfigs = repository<ConfigItem[]>(
    () => {
        return runInLaravel<Config[]>(template("configs"), "Configs").then(
            (result) =>
                result.map((item) => {
                    return {
                        name: item.name,
                        value: item.value,
                        uri: item.file
                            ? vscode.Uri.file(item.file).with({
                                  fragment: `L${item.line}`,
                              })
                            : undefined,
                    };
                }),
        );
    },
    ["config/{,*,**/*}.php", ".env"],
    [],
);
