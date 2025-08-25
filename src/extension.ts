"use strict";

import * as vscode from "vscode";

import os from "os";
import { LanguageClient } from "vscode-languageclient/node";
import { bladeSpacer } from "./blade/bladeSpacer";
import { initClient } from "./blade/client";
import { openFileCommand } from "./commands";
import {
    refactorAllClassesCommand,
    refactorSelectedClassCommand,
} from "./commands/refactorClass";
import { configAffected } from "./support/config";
import { collectDebugInfo } from "./support/debug";
import {
    disposeWatchers,
    watchForComposerChanges,
} from "./support/fileWatcher";
import { info } from "./support/logger";
import { clearParserCaches, setParserBinaryPath } from "./support/parser";
import {
    clearDefaultPhpCommand,
    clearPhpFileCache,
    initPhp,
    initVendorWatchers,
} from "./support/php";
import { hasWorkspace, projectPathExists } from "./support/project";
import { cleanUpTemp } from "./support/util";

let client: LanguageClient;

function shouldActivate(): boolean {
    if (!hasWorkspace()) {
        info("Not activating Laravel Extension because no workspace found");
        return false;
    }

    if (!projectPathExists("artisan")) {
        info("Not activating Laravel Extension because no artisan file found");
        return false;
    }

    return true;
}

export async function activate(context: vscode.ExtensionContext) {
    info("Activating Laravel Extension...");

    if (!shouldActivate()) {
        info(
            'Not activating Laravel Extension because "shouldActivate" returned false',
        );
        return;
    }

    info("Started");

    const [
        { Registry },
        { completionProviders },
        { Eloquent: EloquentCompletion },
        { Validation: ValidationCompletion },
        { Blade: BladeCompletion },
        { completionProvider: bladeComponentCompletion },
        { completionProvider: livewireComponentCompletion },
        { CodeActionProvider },
        { updateDiagnostics },
        { viteEnvCodeActionProvider },
        { hoverProviders },
        { linkProviders },
    ] = await Promise.all([
        import("./completion/Registry.js"),
        import("./completion/CompletionProvider.js"),
        import("./completion/Eloquent.js"),
        import("./completion/Validation.js"),
        import("./completion/Blade.js"),
        import("./features/bladeComponent.js"),
        import("./features/livewireComponent.js"),
        import("./codeAction/codeActionProvider.js"),
        import("./diagnostic/diagnostic.js"),
        import("./features/env.js"),
        import("./hover/HoverProvider.js"),
        import("./link/LinkProvider.js"),
    ]);

    console.log("Laravel VS Code Started...");

    const BLADE_LANGUAGES = [
        { scheme: "file", language: "blade" },
        { scheme: "file", language: "laravel-blade" },
    ];

    const LANGUAGES = [{ scheme: "file", language: "php" }, ...BLADE_LANGUAGES];

    initPhp();
    initVendorWatchers();
    watchForComposerChanges();
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
        vscode.workspace.onDidChangeTextDocument((event) => {
            bladeSpacer(event, vscode.window.activeTextEditor);
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
            BLADE_LANGUAGES,
            bladeComponentCompletion,
            "x",
            "-",
        ),
        vscode.languages.registerCompletionItemProvider(
            BLADE_LANGUAGES,
            livewireComponentCompletion,
            ":",
        ),
        vscode.languages.registerCompletionItemProvider(
            BLADE_LANGUAGES,
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
        vscode.languages.registerCodeActionsProvider(
            [
                { scheme: "file", language: "plaintext" },
                { scheme: "file", language: "ini" },
            ],
            viteEnvCodeActionProvider,
            {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            },
        ),
        vscode.commands.registerCommand("laravel.open", openFileCommand),
        vscode.commands.registerCommand(
            "laravel.refactorSelectedClass",
            refactorSelectedClassCommand,
        ),
        vscode.commands.registerCommand(
            "laravel.refactorAllClasses",
            refactorAllClassesCommand,
        ),
    );

    collectDebugInfo();

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (configAffected(event, "phpCommand", "phpEnvironment")) {
            clearDefaultPhpCommand();
        }
    });
}

export function deactivate() {
    info("Stopped");

    if (os.platform() === "win32") {
        cleanUpTemp();
    }

    disposeWatchers();
    clearParserCaches();
    clearPhpFileCache();

    if (client) {
        client.stop();
    }
}
