import * as vscode from "vscode";
import { GeneratedConfigKey } from "./generated-config";

type ConfigKey =
    | GeneratedConfigKey
    | "phpCommand"
    | "tests.docker.enabled"
    | "tests.ssh.enabled"
    | "tests.suiteSuffix"
    | "showErrorPopups";

export const config = <T>(key: ConfigKey, fallback: T): T =>
    vscode.workspace.getConfiguration("Laravel").get<T>(key, fallback);
