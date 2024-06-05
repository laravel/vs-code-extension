import * as vscode from "vscode";
import { loadAndWatch } from "../support/fileWatcher";
import { runInLaravel, template } from "../support/php";

type AppBindingResult = {
    [key: string]: {
        class: string;
        uri: string;
        startLine: number;
    };
};

let items: {
    [key: string]: {
        class: string;
        uri: vscode.Uri;
    };
} = {};

const load = () => {
    runInLaravel<AppBindingResult>(template("app"), "App Bindings")
        .then((result) => {
            items = {};

            for (let key in result) {
                items[key] = {
                    class: result[key].class,
                    uri: vscode.Uri.file(result[key].uri).with({
                        fragment: `L${result[key].startLine}`,
                    }),
                };
            }
        })
        .catch(function (exception) {
            console.error(exception);
        });
};

loadAndWatch(load, "app/Providers/{,*,**/*}.php");

export const getAppBindings = () => items;
