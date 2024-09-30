import * as vscode from "vscode";
import { ConfigKey } from "../support/generated-config";
import { config as getConfig } from "./../support/config";
import appBinding from "./appBinding";
import asset from "./asset";
import auth from "./auth";
import config from "./config";
import controllerAction from "./controllerAction";
import env from "./env";
import inertia from "./inertia";
import middleware from "./middleware";
import mix from "./mix";
import route from "./route";
import translation from "./translation";
import view from "./view";

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
