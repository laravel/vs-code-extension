import { projectPathExists, readFileInProject } from "@src/support/project";
import * as sysPath from "path";
import * as vscode from "vscode";
import { Uri } from "vscode";
import { repository } from ".";

interface MixManifestItem {
    key: string;
    value: string;
    uri: Uri;
}

const load = (workspaceFolder: vscode.WorkspaceFolder) => {
    const path = "public/mix-manifest.json";

    if (!projectPathExists(path, workspaceFolder)) {
        return [];
    }

    const results: {
        [key: string]: string;
    } = JSON.parse(readFileInProject(path, workspaceFolder));

    return Object.entries(results).map(([key, value]) => ({
        key: key.replace(sysPath.sep, ""),
        value: value.replace(sysPath.sep, ""),
        uri: Uri.file(sysPath.join("public", value)),
    }));
};

export const getMixManifest = repository<MixManifestItem[]>({
    load: (workspaceFolder: vscode.WorkspaceFolder) => {
        return new Promise((resolve, reject) => {
            try {
                resolve(load(workspaceFolder));
            } catch (error) {
                reject(error);
            }
        });
    },
    pattern: "public/mix-manifest.json",
    itemsDefault: [],
    reloadOnComposerChanges: false,
});
