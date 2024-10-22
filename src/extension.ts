"use strict";

require("module-alias/register");

import * as vscode from "vscode";

import { FileDownloader, getApi } from "@microsoft/vscode-file-downloader-api";
import { info } from "console";
import { LanguageClient } from "vscode-languageclient/node";
import { BladeFormattingEditProvider } from "./blade/BladeFormattingEditProvider";
import { initClient } from "./blade/client";
import { CodeActionProvider } from "./codeAction/codeActionProvider";
import { openFileCommand } from "./commands";
import AppCompletion from "./completion/App";
import AssetCompletion from "./completion/Asset";
import GateCompletion from "./completion/Auth";
import BladeCompletion from "./completion/Blade";
import ConfigCompletion from "./completion/Config";
import EloquentCompletion from "./completion/Eloquent";
import EnvCompletion from "./completion/Env";
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
import { setParserBinaryPath } from "./support/parser";
import { hasWorkspace, projectPathExists } from "./support/project";
import DocumentHighlight from "./syntax/DocumentHighlight";
import { testRunnerCommands } from "./test-runner";
import { controller as testController } from "./test-runner/test-controller";

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

    info("Started");

    console.log("Laravel VS Code Started...");

    const LANGUAGES = [
        { scheme: "file", language: "php" },
        { scheme: "file", language: "blade" },
        { scheme: "file", language: "laravel-blade" },
    ];

    downloadBinary(context).then((path) => {
        setParserBinaryPath(path);
    });

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
        ...testRunnerCommands,
        testController,
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

const downloadBinary = async (context: vscode.ExtensionContext) => {
    const binaryVersion = "2.0.0-beta.2";
    const filename = `inertia-${binaryVersion}.zip`;
    const uri = `https://github.com/inertiajs/inertia/archive/refs/tags/v${binaryVersion}.zip`;

    const fileDownloader: FileDownloader = await getApi();

    const downloadedFiles: vscode.Uri[] =
        await fileDownloader.listDownloadedItems(context);

    for (const file of downloadedFiles) {
        // Clean up after ourselves
        if (!file.fsPath.includes(filename)) {
            const filename = file.path.split("/").pop();

            if (filename !== undefined) {
                await fileDownloader.deleteItem(filename, context);
            }
        }
    }

    const downloadedFile: vscode.Uri | undefined =
        await fileDownloader.tryGetItem(filename, context);

    if (downloadedFile !== undefined) {
        return downloadedFile.fsPath;
    }

    vscode.window.showInformationMessage(
        "Downloading binary for Laravel extension",
    );

    const file: vscode.Uri = await fileDownloader.downloadFile(
        vscode.Uri.parse(uri),
        filename,
        context,
    );

    vscode.window.showInformationMessage(
        "Binary downloaded for Laravel extension",
    );

    return file.fsPath;
};

export function deactivate() {
    info("Stopped");

    if (client) {
        client.stop();
    }
}
