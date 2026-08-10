import * as vscode from "vscode";

import { LanguageClient } from "vscode-languageclient/node";
import { getFirstLaravelWorkspaceFolder } from "../support/project";
import { getLspBinaryPath } from "./binary";
import { createClientOptions, createServerOptions } from "./options";
import { clearResolvedPhpCommand, setResolvedPhpCommand } from "./php";

const clients = new Map<string, LanguageClient>();

type LaravelInitializeResult = {
    laravel?: {
        phpCommand: string[];
    };
};

export async function startLspClient(
    workspaceFolder: vscode.WorkspaceFolder = getFirstLaravelWorkspaceFolder()!,
): Promise<LanguageClient | undefined> {
    const client = clients.get(workspaceFolder.name);

    if (client) {
        return client;
    }

    const binaryPath = await getLspBinaryPath();

    if (!binaryPath) {
        return undefined;
    }

    const serverOptions = createServerOptions(binaryPath, workspaceFolder);
    const clientOptions = createClientOptions(workspaceFolder);

    const lspClient = new LanguageClient(
        "laravelLsp",
        `Laravel LSP (${workspaceFolder.name})`,
        serverOptions,
        clientOptions,
    );

    await lspClient.start();

    const initializeResult = lspClient.initializeResult as
        | LaravelInitializeResult
        | undefined;

    if (initializeResult?.laravel) {
        setResolvedPhpCommand(initializeResult.laravel.phpCommand);
    }

    clients.set(workspaceFolder.name, lspClient);

    return lspClient;
}

export async function stopLspClient(
    workspaceFolder: vscode.WorkspaceFolder = getFirstLaravelWorkspaceFolder()!,
): Promise<void> {
    clearResolvedPhpCommand();

    const client = clients.get(workspaceFolder.name);

    if (client) {
        await client.stop();

        clients.delete(workspaceFolder.name);
    }
}

export async function restartLspClient(
    workspaceFolder: vscode.WorkspaceFolder = getFirstLaravelWorkspaceFolder()!,
): Promise<LanguageClient | undefined> {
    await stopLspClient(workspaceFolder);

    return startLspClient(workspaceFolder);
}

export async function sendLspRequest<T>(
    method: string,
    params: object = {},
    workspaceFolder: vscode.WorkspaceFolder = getFirstLaravelWorkspaceFolder()!,
): Promise<T> {
    const client = clients.get(workspaceFolder.name);

    return client!.sendRequest<T>(method, params);
}
