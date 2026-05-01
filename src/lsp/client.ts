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
            appBindingCompletion: config("appBinding.completion", true),
            appBindingDiagnostics: config("appBinding.diagnostics", true),
            appBindingHover: config("appBinding.hover", true),
            appBindingLink: config("appBinding.link", true),
            assetCompletion: config("asset.completion", true),
            assetDiagnostics: config("asset.diagnostics", true),
            assetLink: config("asset.link", true),
            authCompletion: config("auth.completion", true),
            authDiagnostics: config("auth.diagnostics", true),
            authHover: config("auth.hover", true),
            authLink: config("auth.link", true),
            bladeComponentHover: config("bladeComponent.hover", true),
            bladeComponentLink: config("bladeComponent.link", true),
            configCompletion: config("config.completion", true),
            configDiagnostics: config("config.diagnostics", true),
            configHover: config("config.hover", true),
            configLink: config("config.link", true),
            controllerActionCompletion: config(
                "controllerAction.completion",
                true,
            ),
            controllerActionDiagnostics: config(
                "controllerAction.diagnostics",
                true,
            ),
            controllerActionLink: config("controllerAction.link", true),
            envCompletion: config("env.completion", true),
            envDiagnostics: config("env.diagnostics", true),
            envHover: config("env.hover", true),
            envLink: config("env.link", true),
            inertiaCompletion: config("inertia.completion", true),
            inertiaDiagnostics: config("inertia.diagnostics", true),
            inertiaHover: config("inertia.hover", true),
            inertiaLink: config("inertia.link", true),
            livewireComponentHover: config("livewireComponent.hover", true),
            livewireComponentLink: config("livewireComponent.link", true),
            middlewareCompletion: config("middleware.completion", true),
            middlewareDiagnostics: config("middleware.diagnostics", true),
            middlewareHover: config("middleware.hover", true),
            middlewareLink: config("middleware.link", true),
            mixCompletion: config("mix.completion", true),
            mixDiagnostics: config("mix.diagnostics", true),
            mixHover: config("mix.hover", true),
            mixLink: config("mix.link", true),
            pathsLink: config("paths.link", true),
            routeDiagnostics: config("route.diagnostics", true),
            routeCompletion: config("route.completion", true),
            routeHover: config("route.hover", true),
            routeLink: config("route.link", true),
            storageCompletion: config("storage.completion", true),
            storageDiagnostics: config("storage.diagnostics", true),
            storageLink: config("storage.link", true),
            translationDiagnostics: config("translation.diagnostics", true),
            translationHover: config("translation.hover", true),
            translationLink: config("translation.link", true),
            translationCompletion: config("translation.completion", true),
            viewDiagnostics: config("view.diagnostics", true),
            viewCompletion: config("view.completion", true),
            viewHover: config("view.hover", true),
            viewLink: config("view.link", true),
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
