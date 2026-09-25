"use strict";

import * as vscode from "vscode";

import os from "os";
import { LanguageClient } from "vscode-languageclient/node.js";
import { bladeSpacer } from "./blade/bladeSpacer.js";
import { initClient } from "./blade/client.js";
import { commandName, openFileCommand } from "./commands/index.js";
import { generateNamespaceCommand } from "./commands/generateNamespace.js";
import { goToRouteCommand } from "./commands/goToRoute.js";
import {
    pintCommands,
    PintEditProvider,
    runPint,
    runPintOnCurrentFile,
    runPintOnDirtyFiles,
    runPintOnSave,
} from "./commands/pint.js";
import {
    htmlClassToBladeDirectiveCommands,
    refactorAllHtmlClassesToBladeDirectives,
    refactorSelectedHtmlClassToBladeDirective,
} from "./commands/refactorHtmlClassToBladeDirective.js";
import {
    helpers,
    openSubmenuCommand,
    unwrapSelectionCommand,
    wrapHelperCommandNameSubCommandName,
    wrapSelectionCommand,
    wrapWithHelperCommands,
} from "./commands/wrapWithHelper.js";
import { configAffected } from "./support/config.js";
import { collectDebugInfo } from "./support/debug.js";
import { disposeWatchers } from "./support/fileWatcher.js";
import { info } from "./support/logger.js";
import {
    restartLspClient,
    startLspClient,
    stopLspClient,
} from "./lsp/client.js";
import { setLspBinaryPath } from "./lsp/binary.js";
import {
    clearResolvedPhpCommand,
    warnAboutLegacyPhpCommand,
} from "./lsp/php.js";
import { checkForLspUpdate, forceLspUpdate } from "./lsp/updater.js";
import { hasWorkspace, projectPathExists } from "./support/project.js";
import { cleanUpTemp } from "./support/util.js";
import {
    registerArtisanCommands,
    registerArtisanMakeCommands,
} from "./artisan/registry.js";
import { configureDockerEnvironment } from "./commands/configureDockerEnvironment.js";

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
        vscode.commands.registerCommand(commandName("laravel.lsp.update"), () =>
            forceLspUpdate(context, shouldActivate()),
        ),
    );

    if (!shouldActivate()) {
        info(
            'Not activating Laravel Extension because "shouldActivate" returned false',
        );
        return;
    }

    info("Started");

    warnAboutLegacyPhpCommand();

    setLspBinaryPath(context);

    const lspClient = await startLspClient().catch((error) => {
        console.error("Failed to start Laravel LSP:", error);

        return undefined;
    });

    if (lspClient) {
        const { registerTestRunner } = await import("./test-runner/index.js");

        registerTestRunner();
    }

    void checkForLspUpdate(context);

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
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (
                configAffected(
                    event,
                    "phpCommand",
                    "phpEnvironment",
                    "memoryLimit",
                )
            ) {
                clearResolvedPhpCommand();

                restartLspClient().catch((error) => {
                    console.error("Failed to restart Laravel LSP:", error);
                });
            }
        }),
    );

    collectDebugInfo();
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
