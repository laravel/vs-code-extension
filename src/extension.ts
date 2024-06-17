"use strict";

import * as vscode from "vscode";

import { info } from "console";
import { LanguageClient } from "vscode-languageclient/node";
import { BladeFormattingEditProvider } from "./blade/BladeFormattingEditProvider";
import { initClient } from "./blade/client";
import { registeredCommands } from "./commands";
import AppCompletion from "./completion/App";
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
import VoltCompletion from "./completion/Volt";
import { updateDiagnostics } from "./diagnostic/diagnostic";
import HoverProvider from "./hover/HoverProvider";
import LinkProvider from "./link/LinkProvider";
import { hasWorkspace, projectPathExists } from "./support/project";
import DocumentHighlight from "./syntax/DocumentHighlight";

let client: LanguageClient;

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

    info("Started Laravel Extension!");

    console.log("Laravel VS Code Started...");

    const LANGUAGES = [
        { scheme: "file", language: "php" },
        { scheme: "file", language: "blade" },
        { scheme: "file", language: "laravel-blade" },
    ];

    const TRIGGER_CHARACTERS = ["'", '"'];

    updateDiagnostics(vscode.window.activeTextEditor);

    context.subscriptions.push();

    const delegatedRegistry = new Registry(
        new ConfigCompletion(),
        new RouteCompletion(),
        new ViewCompletion(),
        new TranslationCompletion(),
        new MixCompletion(),
        new EnvCompletion(),
        new GateCompletion(),
        new AssetCompletion(),
        new InertiaCompletion(),
        new AppCompletion(),
    );

    const eloquentRegistry = new Registry(new EloquentCompletion());

    const validationRegistry = new Registry(new ValidationCompletion());

    const documentSelector: vscode.DocumentSelector = {
        language: "blade",
    };

    client = initClient(context);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            updateDiagnostics(editor);
        }),
        vscode.workspace.onDidSaveTextDocument((event) => {
            updateDiagnostics(vscode.window.activeTextEditor);
        }),
        vscode.languages.registerDocumentHighlightProvider(
            documentSelector,
            new DocumentHighlight(),
        ),
        vscode.languages.registerDocumentFormattingEditProvider(
            documentSelector,
            new BladeFormattingEditProvider(),
        ),
        vscode.languages.registerDocumentRangeFormattingEditProvider(
            documentSelector,
            new BladeFormattingEditProvider(),
        ),
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
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            new VoltCompletion(),
            ...TRIGGER_CHARACTERS.concat(["$"]),
        ),
        vscode.languages.registerDocumentLinkProvider(
            LANGUAGES,
            new LinkProvider(),
        ),
        vscode.languages.registerHoverProvider(LANGUAGES, new HoverProvider()),
        ...registeredCommands,
    );
}

export function deactivate() {
    info("Stopped");

    if (client) {
        client.stop();
    }
}
