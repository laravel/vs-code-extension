import * as vscode from "vscode";
import { GeneratedConfigKey } from "./generated-config";

type ConfigKey =
    | GeneratedConfigKey
    | "basePath"
    | "phpEnvironment"
    | "phpCommand"
    | "dockerPhpCommand"
    | "tests.docker.enabled"
    | "tests.ssh.enabled"
    | "tests.suiteSuffix"
    | "showErrorPopups"
    | "blade.autoSpaceTags"
    | "eloquent.generateDocBlocks"
    | "env.viteQuickFix"
    | "pint.runOnSave";

export const config = <T>(key: ConfigKey, fallback: T): T =>
    vscode.workspace.getConfiguration("Laravel").get<T>(key, fallback);

export const configKey = <T>(key: ConfigKey): string => `Laravel.${key}`;

export const configAffected = (
    event: vscode.ConfigurationChangeEvent,
    ...keys: ConfigKey[]
): boolean => keys.some((key) => event.affectsConfiguration(configKey(key)));

export const updateConfig = (key: ConfigKey, value: any) => {
    return vscode.workspace
        .getConfiguration("Laravel")
        .update(key, value, true);
};
