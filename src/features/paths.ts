import { getPaths } from "@src/repositories/paths";
import { detectedRange, detectInDoc } from "@src/support/parser";
import fs from "fs";
import * as vscode from "vscode";
import { FeatureTag, LinkProvider } from "..";

const toFind: FeatureTag = {
    method: [
        "base_path",
        "resource_path",
        "config_path",
        "app_path",
        "database_path",
        "lang_path",
        "public_path",
        "storage_path",
    ],
    argumentIndex: 0,
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getPaths,
        ({ param, item }) => {
            const basePath = getPaths().items.find(
                // @ts-ignore
                (asset) => asset.key === item.methodName,
            );

            if (!basePath) {
                return null;
            }

            const path = param.value.startsWith("/")
                ? param.value
                : `/${param.value}`;

            const fullPath = basePath.path + path;

            const stat = fs.lstatSync(fullPath, {
                throwIfNoEntry: false,
            });

            if (!stat?.isFile()) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(fullPath),
            );
        },
    );
};
