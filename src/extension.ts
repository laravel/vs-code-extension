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
import AuthProvider from "./AuthProvider";
import AssetProvider from "./AssetProvider";
import EloquentProvider from "./EloquentProvider";
import BladeProvider from "./BladeProvider";
import Logger from "./Logger";
import Registry from "./Registry";

function shouldActivate(): boolean {
    if (!Helpers.hasWorkspace()) {
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

    const delegatedProviders = [
        ConfigProvider,
        RouteProvider,
        ViewProvider,
        TranslationProvider,
        MixProvider,
        EnvProvider,
        AuthProvider,
        AssetProvider,
    ];

    const delegatedRegistry = new Registry();

    delegatedProviders.forEach((provider) => {
        delegatedRegistry.registerProvider(new provider());
    });

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            delegatedRegistry,
            ...TRIGGER_CHARACTERS,
        ),
        // vscode.languages.registerCompletionItemProvider(
        //     LANGUAGES,
        //     new ValidationProvider(),
        //     ...TRIGGER_CHARACTERS.concat(["|"]),
        // ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            new EloquentProvider(),
            ...TRIGGER_CHARACTERS.concat([">"]),
        ),
        // vscode.languages.registerCompletionItemProvider(
        //     LANGUAGES,
        //     new BladeProvider(),
        //     "@",
        // ),
    );
}

export function deactivate() {}
