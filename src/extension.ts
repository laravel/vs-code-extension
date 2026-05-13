"use strict";

import * as vscode from "vscode";

import os from "os";
import { LanguageClient } from "vscode-languageclient/node";
import { bladeSpacer } from "./blade/bladeSpacer";
import { initClient } from "./blade/client";
import { commandName, openFileCommand } from "./commands";
import { generateNamespaceCommand } from "./commands/generateNamespace";
import { goToRouteCommand } from "./commands/goToRoute";
import {
    pintCommands,
    PintEditProvider,
    runPint,
    runPintOnCurrentFile,
    runPintOnDirtyFiles,
    runPintOnSave,
} from "./commands/pint";
import {
    htmlClassToBladeDirectiveCommands,
    refactorAllHtmlClassesToBladeDirectives,
    refactorSelectedHtmlClassToBladeDirective,
} from "./commands/refactorHtmlClassToBladeDirective";
import {
    helpers,
    openSubmenuCommand,
    unwrapSelectionCommand,
    wrapHelperCommandNameSubCommandName,
    wrapSelectionCommand,
    wrapWithHelperCommands,
} from "./commands/wrapWithHelper";
import { configAffected } from "./support/config";
import { collectDebugInfo } from "./support/debug";
import { disposeWatchers } from "./support/fileWatcher";
import { info } from "./support/logger";
import { startLspClient, stopLspClient } from "./lsp/client";
import { setLspBinaryPath } from "./lsp/binary";
import { clearDefaultPhpCommand } from "./support/php";
import { hasWorkspace, projectPathExists } from "./support/project";
import { cleanUpTemp } from "./support/util";
import {
    registerArtisanCommands,
    registerArtisanMakeCommands,
} from "./artisan/registry";
import { configureDockerEnvironment } from "./commands/configureDockerEnvironment";

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

    const PHP_LANGUAGE = { scheme: "file", language: "php" };

    context.subscriptions.push(
        vscode.commands.registerCommand(
            commandName("laravel.open"),
            openFileCommand,
        ),
        vscode.commands.registerCommand(pintCommands.all, runPint),
        vscode.commands.registerCommand(
            pintCommands.currentFile,
            runPintOnCurrentFile,
        ),
        vscode.commands.registerCommand(
            pintCommands.dirtyFiles,
            runPintOnDirtyFiles,
        ),
        vscode.languages.registerDocumentFormattingEditProvider(
            PHP_LANGUAGE,
            new PintEditProvider(),
        ),
        vscode.commands.registerCommand(
            commandName("laravel.namespace.generate"),
            generateNamespaceCommand,
        ),
        vscode.commands.registerCommand(
            commandName("laravel.goToRoute"),
            goToRouteCommand,
        ),
    );

    if (!shouldActivate()) {
        info(
            'Not activating Laravel Extension because "shouldActivate" returned false',
        );
        return;
    }

    info("Started");

    setLspBinaryPath(context);

    const lspClient = await startLspClient().catch((error) => {
        console.error("Failed to start Laravel LSP:", error);

        return undefined;
    });

    if (lspClient) {
        const { registerTestRunner } = await import("./test-runner/index.js");

        registerTestRunner();
    }

    console.log("Laravel VS Code Started...");

    client = initClient(context);

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((event) => {
            runPintOnSave(event);
        }),
        vscode.workspace.onDidChangeTextDocument((event) => {
            bladeSpacer(event, vscode.window.activeTextEditor);
        }),
        vscode.commands.registerCommand(
            wrapWithHelperCommands.wrap,
            openSubmenuCommand,
        ),
        vscode.commands.registerCommand(
            wrapWithHelperCommands.unwrap,
            unwrapSelectionCommand,
        ),
        ...helpers.map((helper) => {
            return vscode.commands.registerCommand(
                wrapHelperCommandNameSubCommandName(helper),
                () => wrapSelectionCommand(helper),
            );
        }),
        vscode.commands.registerCommand(
            htmlClassToBladeDirectiveCommands.selected,
            refactorSelectedHtmlClassToBladeDirective,
        ),
        vscode.commands.registerCommand(
            htmlClassToBladeDirectiveCommands.all,
            refactorAllHtmlClassesToBladeDirectives,
        ),
        ...registerArtisanMakeCommands(),
        ...registerArtisanCommands(),
        vscode.commands.registerCommand(
            commandName("laravel.docker.configure"),
            configureDockerEnvironment,
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

    if (client) {
        client.stop();
    }

    stopLspClient();
}
