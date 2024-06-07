import { Uri } from "vscode";
import { repository } from ".";
import { projectPathExists, readFileInProject } from "../support/project";

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
        key: key.replace(/^\//g, ""),
        value: value.replace(/^\//g, ""),
        uri: Uri.file(`public/${value}`),
    }));
};

export const getMixManifest = repository<MixManifestItem[]>(
    () => {
        return new Promise((resolve, reject) => {
            try {
                resolve(load());
            } catch (error) {
                reject(error);
            }
        });
    },
    "public/mix-manifest.json",
    [],
);
