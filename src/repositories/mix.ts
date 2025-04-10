import { projectPathExists, readFileInProject } from "@src/support/project";
import * as sysPath from "path";
import { Uri } from "vscode";
import { repository } from ".";

interface MixManifestItem {
    key: string;
    value: string;
    uri: Uri;
}

const load = () => {
    const path = "public/mix-manifest.json";

    if (!projectPathExists(path)) {
        return [];
    }

    const results: {
        [key: string]: string;
    } = JSON.parse(readFileInProject(path));

    return Object.entries(results).map(([key, value]) => ({
        key: key.replace(sysPath.sep, ""),
        value: value.replace(sysPath.sep, ""),
        uri: Uri.file(sysPath.join("public", value)),
    }));
};

export const getMixManifest = repository<MixManifestItem[]>({
    load: () => {
        return new Promise((resolve, reject) => {
            try {
                resolve(load());
            } catch (error) {
                reject(error);
            }
        });
    },
    pattern: "public/mix-manifest.json",
    itemsDefault: [],
    reloadOnComposerChanges: false,
});
