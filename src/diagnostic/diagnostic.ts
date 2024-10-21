import { diagnosticProvider as appBinding } from "@/features/appBinding";
import { diagnosticProvider as asset } from "@/features/asset";
import { diagnosticProvider as auth } from "@/features/auth";
import { diagnosticProvider as config } from "@/features/config";
import { diagnosticProvider as controllerAction } from "@/features/controllerAction";
import { diagnosticProvider as env } from "@/features/env";
import { diagnosticProvider as inertia } from "@/features/inertia";
import { diagnosticProvider as middleware } from "@/features/middleware";
import { diagnosticProvider as mix } from "@/features/mix";
import { diagnosticProvider as route } from "@/features/route";
import { diagnosticProvider as translation } from "@/features/translation";
import { diagnosticProvider as view } from "@/features/view";
import { config as getConfig } from "@/support/config";
import { ConfigKey } from "@/support/generated-config";
import * as vscode from "vscode";

const collection = vscode.languages.createDiagnosticCollection("laravel");

const providers: {
    provider: (doc: vscode.TextDocument) => Promise<vscode.Diagnostic[]>;
    configKey: ConfigKey;
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
