import * as vscode from "vscode";
import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface MiddlewareResultItem {
    [key: string]: {
        class: string | null;
        uri: string | null;
        startLine: number | null;
        parameters: string | null;
    };
}

interface MiddlewareItem {
    [key: string]: {
        class: string | null;
        uri: vscode.Uri | null;
        startLine: number | null;
        parameters: string | null;
    };
}

export const getMiddleware = repository<MiddlewareItem>(
    () => {
        return runInLaravel<MiddlewareResultItem>(
            template("middleware"),
            "Middlewares",
        ).then((result) => {
            const items: MiddlewareItem = {};

            for (let key in result) {
                items[key] = {
                    class: result[key].class,
                    uri:
                        result[key].uri === null
                            ? null
                            : vscode.Uri.file(result[key].uri).with({
                                  fragment: `L${result[key].startLine}`,
                              }),
                    startLine: result[key].startLine,
                    parameters: result[key].parameters,
                };
            }

            return items;
        });
    },
    "app/Http/Kernel.php",
    {},
    ["change"],
);
