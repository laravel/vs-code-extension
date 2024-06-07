import * as vscode from "vscode";
import { repository } from ".";
import { runInLaravel, template } from "../support/php";

type AppBindingResult = {
    [key: string]: {
        class: string;
        uri: string;
        startLine: number;
    };
};

type AppBindingItem = {
    [key: string]: {
        class: string;
        uri: vscode.Uri;
    };
};

export const getAppBindings = repository<AppBindingItem>(
    () => {
        return runInLaravel<AppBindingResult>(
            template("app"),
            "App Bindings",
        ).then((result) => {
            const items: AppBindingItem = {};

            for (let key in result) {
                items[key] = {
                    class: result[key].class,
                    uri: vscode.Uri.file(result[key].uri).with({
                        fragment: `L${result[key].startLine}`,
                    }),
                };
            }

            return items;
        });
    },
    "app/Providers/{,*,**/*}.php",
    {},
);
