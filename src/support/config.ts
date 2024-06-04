import * as vscode from "vscode";

export const config = <T>(key: string, fallback: T): T =>
    vscode.workspace.getConfiguration("Laravel").get<T>(key, fallback);
