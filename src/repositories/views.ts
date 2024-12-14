import { runInLaravel, template } from "@src/support/php";
import * as vscode from "vscode";
import { repository } from ".";

export interface ViewItem {
    key: string;
    path: string;
    uri: vscode.Uri;
    isVendor: boolean;
}

const load = () => {
    return runInLaravel<
        {
            key: string;
            path: string;
            isVendor: boolean;
        }[]
    >(template("views")).then((results) => {
        return results.map(({ key, path, isVendor }) => {
            return {
                key,
                path,
                uri: vscode.Uri.file(path),
                isVendor,
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
