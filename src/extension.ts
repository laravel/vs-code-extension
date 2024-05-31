"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import Helpers from "./helpers";

import RouteProvider from "./RouteProvider";
import ViewProvider from "./ViewProvider";
import ConfigProvider from "./ConfigProvider";
import TranslationProvider from "./TranslationProvider";
import MixProvider from "./MixProvider";
import ValidationProvider from "./ValidationProvider";
import EnvProvider from "./EnvProvider";
import MiddlewareProvider from "./MiddlewareProvider";
import AuthProvider from "./AuthProvider";
import AssetProvider from "./AssetProvider";
import EloquentProvider from "./EloquentProvider";
import BladeProvider from "./BladeProvider";
import Logger from "./Logger";

function shouldActivate(): boolean {
    const hasWorkspaces =
        vscode.workspace.workspaceFolders instanceof Array &&
        vscode.workspace.workspaceFolders.length > 0;

    if (!hasWorkspaces) {
        return false;
    }

    if (!fs.existsSync(Helpers.projectPath("artisan"))) {
        return false;
    }

    return true;
}

export function activate(context: vscode.ExtensionContext) {
    console.log("Activating Laravel Extension...");

    if (!shouldActivate()) {
        return;
    }

    Logger.setup();

    Logger.channel?.info("Started");

    console.log("Laravel VS Code Started...");

    const LANGUAGES = [
        { scheme: "file", language: "php" },
        { scheme: "file", language: "blade" },
        { scheme: "file", language: "laravel-blade" },
    ];
    const TRIGGER_CHARACTERS = ["'", '"'];
    const providers = [
        RouteProvider,
        ViewProvider,
        ConfigProvider,
        TranslationProvider,
        MixProvider,
        EnvProvider,
        MiddlewareProvider,
        AuthProvider,
        AssetProvider,
    ];

    providers.forEach((Provider) => {
        Helpers.registerProvider(Provider);

        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                LANGUAGES,
                new Provider(),
                ...TRIGGER_CHARACTERS,
            ),
        );
    });

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            new ValidationProvider(),
            ...TRIGGER_CHARACTERS.concat(["|"]),
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            new EloquentProvider(),
            ...TRIGGER_CHARACTERS.concat([">"]),
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            new BladeProvider(),
            "@",
        ),
    );
}

export function deactivate() {}
