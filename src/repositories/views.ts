import { runInLaravel, template } from "@src/support/php";
import * as vscode from "vscode";
import { repository } from ".";

interface ViewItem {
    key: string;
    path: string;
    uri: vscode.Uri;
}

const load = () => {
    return runInLaravel<
        {
            key: string;
            path: string;
            isVendor: boolean;
        }[]
    >(template("views")).then((results) => {
        return results.map(({ key, path }) => {
            return {
                key,
                path,
                uri: vscode.Uri.file(path),
            };
        });
    });
};

export const getViews = repository<ViewItem[]>(
    load,
    "{,**/}{view,views}/{*,**/*}",
    [],
    ["create", "delete"],
);
