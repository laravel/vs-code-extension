import * as vscode from "vscode";

export const statusBarWorking = (
    message: string,
    dismissAfter: number = 2000,
) => {
    vscode.window.setStatusBarMessage(
        `$(loading~spin) ${message}`,
        dismissAfter,
    );
};

export const statusBarSuccess = (
    message: string,
    dismissAfter: number = 3000,
) => {
    vscode.window.setStatusBarMessage(`$(check) ${message}`, dismissAfter);
};

export const statusBarError = (
    message: string,
    dismissAfter: number = 3000,
) => {
    vscode.window.setStatusBarMessage(`$(error) ${message}`, dismissAfter);
};
