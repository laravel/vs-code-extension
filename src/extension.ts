"use strict";

import * as vscode from "vscode";

import AssetProvider from "./AssetProvider";
import BladeProvider from "./BladeProvider";
import ConfigProvider from "./ConfigProvider";
import EloquentProvider from "./EloquentProvider";
import EnvProvider from "./EnvProvider";
import GateProvider from "./GateProvider";
import LinkProvider from "./LinkProvider";
import Logger from "./Logger";
import MixProvider from "./MixProvider";
import Registry from "./Registry";
import RouteProvider from "./RouteProvider";
import TranslationProvider from "./TranslationProvider";
import ValidationProvider from "./ValidationProvider";
import ViewProvider from "./ViewProvider";
// import HoverProvider from "./HoverProvider";
import InertiaProvider from "./InertiaProvider";
import { hasWorkspace, projectPathExists } from "./support/project";

function shouldActivate(): boolean {
    if (!hasWorkspace()) {
        return false;
    }

    if (!projectPathExists("artisan")) {
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

    Logger.info("Started");

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
        GateProvider,
        AssetProvider,
        InertiaProvider,
    ];

    const delegatedRegistry = new Registry();

    delegatedProviders.forEach((provider) => {
        delegatedRegistry.registerProvider(new provider());
    });

    const eloquentRegistry = new Registry();
    eloquentRegistry.registerProvider(new EloquentProvider());

    const validationRegistry = new Registry();
    validationRegistry.registerProvider(new ValidationProvider());

    // let hover = vscode.languages.registerHoverProvider(
    //     LANGUAGES,
    //     new HoverProvider(),
    // );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            delegatedRegistry,
            ...TRIGGER_CHARACTERS,
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            eloquentRegistry,
            ...TRIGGER_CHARACTERS.concat([">"]),
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            validationRegistry,
            ...TRIGGER_CHARACTERS.concat(["|"]),
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            new BladeProvider(),
            "@",
        ),
        vscode.languages.registerDocumentLinkProvider(
            LANGUAGES,
            new LinkProvider(),
        ),
        // hover,
    );
}

export function deactivate() {}
