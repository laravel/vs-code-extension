"use strict";

import * as vscode from "vscode";

import { info } from "console";
import AssetCompletion from "./completion/Asset";
import BladeCompletion from "./completion/Blade";
import ConfigCompletion from "./completion/Config";
import EloquentCompletion from "./completion/Eloquent";
import EnvCompletion from "./completion/Env";
import GateCompletion from "./completion/Gate";
import InertiaCompletion from "./completion/Inertia";
import MixCompletion from "./completion/Mix";
import Registry from "./completion/Registry";
import RouteCompletion from "./completion/Route";
import TranslationCompletion from "./completion/Translation";
import ValidationCompletion from "./completion/Validation";
import ViewCompletion from "./completion/View";
import configHover from "./hover/Config";
import HoverProvider from "./hover/HoverProvider";
import inertiaHover from "./hover/Inertia";
import viewHover from "./hover/View";
import configLink from "./link/Config";
import inertiaLink from "./link/Inertia";
import LinkProvider from "./link/LinkProvider";
import viewLink from "./link/View";
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

    info("Started");

    console.log("Laravel VS Code Started...");

    const LANGUAGES = [
        { scheme: "file", language: "php" },
        { scheme: "file", language: "blade" },
        { scheme: "file", language: "laravel-blade" },
    ];

    const TRIGGER_CHARACTERS = ["'", '"'];

    const delegatedProviders = [
        ConfigCompletion,
        RouteCompletion,
        ViewCompletion,
        TranslationCompletion,
        MixCompletion,
        EnvCompletion,
        GateCompletion,
        AssetCompletion,
        InertiaCompletion,
    ];

    const delegatedRegistry = new Registry();

    delegatedProviders.forEach((provider) => {
        delegatedRegistry.registerProvider(new provider());
    });

    const eloquentRegistry = new Registry();
    eloquentRegistry.registerProvider(new EloquentCompletion());

    const validationRegistry = new Registry();
    validationRegistry.registerProvider(new ValidationCompletion());

    const hoverProvider = new HoverProvider();
    hoverProvider.registerProvider(configHover);
    hoverProvider.registerProvider(viewHover);
    hoverProvider.registerProvider(inertiaHover);

    const linkProvider = new LinkProvider();
    linkProvider.registerProvider(configLink);
    linkProvider.registerProvider(viewLink);
    linkProvider.registerProvider(inertiaLink);

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
            new BladeCompletion(),
            "@",
        ),
        vscode.languages.registerDocumentLinkProvider(LANGUAGES, linkProvider),
        vscode.languages.registerHoverProvider(LANGUAGES, hoverProvider),
    );
}

export function deactivate() {}
