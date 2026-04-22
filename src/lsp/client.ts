import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from "vscode-languageclient/node";
import { config } from "../support/config";
import { getParserBinaryPath } from "../support/parser";

let client: LanguageClient | undefined;

export async function startLspClient(): Promise<void> {
    const binaryPath = await getParserBinaryPath();

    if (!binaryPath) {
        return;
    }

    const serverOptions: ServerOptions = {
        command: binaryPath,
        args: ["lsp"],
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: "file", language: "php" },
            { scheme: "file", language: "blade" },
            { scheme: "file", language: "laravel-blade" },
        ],
        initializationOptions: {
            routeDiagnostics: config("route.diagnostics", true),
            routeHover: config("route.hover", true),
        },
    };

    client = new LanguageClient(
        "laravelLsp",
        "Laravel LSP",
        serverOptions,
        clientOptions,
    );

    await client.start();
}

export async function stopLspClient(): Promise<void> {
    if (client) {
        await client.stop();
        client = undefined;
    }
}
