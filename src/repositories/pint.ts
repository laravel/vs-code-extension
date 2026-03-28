import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { repository } from ".";

interface PintConfig {
    exclude?: string[];
    notName?: string[];
    notPath?: string[];
}

export const getPintConfig = repository<PintConfig>({
    load: (workspaceFolder: vscode.WorkspaceFolder) =>
        new Promise((resolve, reject) => {
            try {
                const pintConfigPath = path.join(
                    workspaceFolder.uri.fsPath,
                    "pint.json",
                );

                if (!fs.existsSync(pintConfigPath)) {
                    resolve({});

                    return;
                }

                const pintConfig = JSON.parse(
                    fs.readFileSync(pintConfigPath, "utf8"),
                );

                resolve(pintConfig);
            } catch (exception) {
                reject(exception);
            }
        }),
    pattern: "pint.json",
    itemsDefault: {},
    reloadOnComposerChanges: false,
});
