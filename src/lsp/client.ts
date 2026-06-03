import { LanguageClient } from "vscode-languageclient/node";
import { getProjectWorkspaceFolder } from "../support/project";
import { getLspBinaryPath } from "./binary";
import { createClientOptions, createServerOptions } from "./options";
import { clearResolvedPhpCommand, setResolvedPhpCommand } from "./php";

let client: LanguageClient | undefined;

type LaravelInitializeResult = {
    laravel?: {
        phpCommand: string[];
    };
};

export async function startLspClient(): Promise<LanguageClient | undefined> {
    if (client) {
        return client;
    }

    const binaryPath = await getLspBinaryPath();

    if (!binaryPath) {
        return undefined;
    }

    const workspaceFolder = getProjectWorkspaceFolder();
    const serverOptions = createServerOptions(binaryPath, workspaceFolder);
    const clientOptions = createClientOptions(workspaceFolder);

    const lspClient = new LanguageClient(
        "laravelLsp",
        "Laravel LSP",
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

    client = lspClient;

    return client;
}

export async function stopLspClient(): Promise<void> {
    clearResolvedPhpCommand();

    if (client) {
        await client.stop();
        client = undefined;
    }
}

export async function restartLspClient(): Promise<LanguageClient | undefined> {
    await stopLspClient();

    return startLspClient();
}

export async function sendLspRequest<T>(
    method: string,
    params: object = {},
): Promise<T> {
    return client!.sendRequest<T>(method, params);
}
