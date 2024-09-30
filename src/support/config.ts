import * as vscode from "vscode";
import { ConfigKey } from "./generated-config";

export const config = <T>(key: ConfigKey, fallback: T): T =>
    vscode.workspace.getConfiguration("Laravel").get<T>(key, fallback);
