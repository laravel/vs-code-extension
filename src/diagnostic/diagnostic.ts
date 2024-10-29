import { diagnosticProvider as appBinding } from "@src/features/appBinding";
import { diagnosticProvider as asset } from "@src/features/asset";
import { diagnosticProvider as auth } from "@src/features/auth";
import { diagnosticProvider as config } from "@src/features/config";
import { diagnosticProvider as controllerAction } from "@src/features/controllerAction";
import { diagnosticProvider as env } from "@src/features/env";
import { diagnosticProvider as inertia } from "@src/features/inertia";
import { diagnosticProvider as middleware } from "@src/features/middleware";
import { diagnosticProvider as mix } from "@src/features/mix";
import { diagnosticProvider as route } from "@src/features/route";
import { diagnosticProvider as translation } from "@src/features/translation";
import { diagnosticProvider as view } from "@src/features/view";
import { config as getConfig } from "@src/support/config";
import { GeneratedConfigKey } from "@src/support/generated-config";
import * as vscode from "vscode";

const collection = vscode.languages.createDiagnosticCollection("laravel");

const providers: {
    provider: (doc: vscode.TextDocument) => Promise<vscode.Diagnostic[]>;
    configKey: GeneratedConfigKey;
}[] = [
    { provider: appBinding, configKey: "appBinding.diagnostics" },
    { provider: asset, configKey: "asset.diagnostics" },
    { provider: auth, configKey: "auth.diagnostics" },
    { provider: config, configKey: "config.diagnostics" },
    { provider: controllerAction, configKey: "controllerAction.diagnostics" },
    { provider: env, configKey: "env.diagnostics" },
    { provider: inertia, configKey: "inertia.diagnostics" },
    { provider: middleware, configKey: "middleware.diagnostics" },
    { provider: mix, configKey: "mix.diagnostics" },
    { provider: route, configKey: "route.diagnostics" },
    { provider: translation, configKey: "translation.diagnostics" },
    { provider: view, configKey: "view.diagnostics" },
];

export const updateDiagnostics = (
    editor: vscode.TextEditor | undefined,
): void => {
    collection.clear();

    if (!editor) {
        return;
    }

    const document = editor.document;

    if (!document) {
        return;
    }

    Promise.all(
        providers
            .filter((provider) => getConfig(provider.configKey, true))
            .map((provider) => provider.provider(document)),
    ).then((diagnostics) => {
        collection.set(document.uri, diagnostics.flat());
    });
};
