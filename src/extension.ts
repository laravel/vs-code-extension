"use strict";

import * as vscode from "vscode";

import { LanguageClient } from "vscode-languageclient/node";
import { initClient } from "./blade/client";
import { CodeActionProvider } from "./codeAction/codeActionProvider";
import { openFileCommand } from "./commands";
import BladeCompletion from "./completion/Blade";
import { completionProviders } from "./completion/CompletionProvider";
import EloquentCompletion from "./completion/Eloquent";
import Registry from "./completion/Registry";
import ValidationCompletion from "./completion/Validation";
import { updateDiagnostics } from "./diagnostic/diagnostic";
import { hoverProviders } from "./hover/HoverProvider";
import { linkProviders } from "./link/LinkProvider";
import { info } from "./support/logger";
import { setParserBinaryPath } from "./support/parser";
import { hasWorkspace, projectPathExists } from "./support/project";

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
    info("Activating Laravel Extension...");

    if (!shouldActivate()) {
        info(
            'Not activating Laravel Extension because "shouldActivate" returned false',
        );
        return;
    }

    info("Started");

    console.log("Laravel VS Code Started...");

    const LANGUAGES = [
        { scheme: "file", language: "php" },
        { scheme: "file", language: "blade" },
        { scheme: "file", language: "laravel-blade" },
    ];

    setParserBinaryPath(context);

    const TRIGGER_CHARACTERS = ["'", '"'];

    updateDiagnostics(vscode.window.activeTextEditor);

    context.subscriptions.push();

    const delegatedRegistry = new Registry(
        ...completionProviders,
        new EloquentCompletion(),
    );

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
        // vscode.languages.registerDocumentHighlightProvider(
        //     documentSelector,
        //     new DocumentHighlight(),
        // ),
        // vscode.languages.registerDocumentFormattingEditProvider(
        //     documentSelector,
        //     new BladeFormattingEditProvider(),
        // ),
        // vscode.languages.registerDocumentRangeFormattingEditProvider(
        //     documentSelector,
        //     new BladeFormattingEditProvider(),
        // ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            delegatedRegistry,
            ...TRIGGER_CHARACTERS,
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
        ...linkProviders.map((provider) =>
            vscode.languages.registerDocumentLinkProvider(LANGUAGES, provider),
        ),
        ...hoverProviders.map((provider) =>
            vscode.languages.registerHoverProvider(LANGUAGES, provider),
        ),
        // ...testRunnerCommands,
        // testController,
        vscode.languages.registerCodeActionsProvider(
            LANGUAGES,
            new CodeActionProvider(),
            {
                providedCodeActionKinds:
                    CodeActionProvider.providedCodeActionKinds,
            },
        ),
        vscode.commands.registerCommand("laravel.open", openFileCommand),
    );
}

export function deactivate() {
    info("Stopped");

    if (client) {
        client.stop();
    }
}
