"use strict";

import * as vscode from "vscode";

import { info } from "console";
import { LanguageClient } from "vscode-languageclient/node";
import { BladeFormattingEditProvider } from "./blade/BladeFormattingEditProvider";
import { initClient } from "./blade/client";
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

import ClearCompiled from "./commands/base/ClearCompiled";
import List from "./commands/base/List";
import Migrate from "./commands/base/Migrate";
import Optimize from "./commands/base/Optimize";
import Server from "./commands/base/Serve";
import CacheClear from "./commands/cache/Clear";
import CacheTable from "./commands/cache/Table";
import ConfigCache from "./commands/config/Cache";
import ConfigCacheClear from "./commands/config/Clear";
import ConfigCacheRefresh from "./commands/config/Refresh";
import EventGenerate from "./commands/event/Generate";
import KeyGenerate from "./commands/key/Generate";
import MakeAuth from "./commands/make/Auth";
import MakeCast from "./commands/make/Cast";
import MakeChannel from "./commands/make/Channel";
import MakeCommand from "./commands/make/Command";
import MakeComponent from "./commands/make/Component";
import MakeController from "./commands/make/Controller";
import MakeEvent from "./commands/make/Event";
import MakeFactory from "./commands/make/Factory";
import MakeJob from "./commands/make/Job";
import MakeListener from "./commands/make/Listener";
import MakeMail from "./commands/make/Mail";
import MakeMiddleware from "./commands/make/Middleware";
import MakeMigration from "./commands/make/Migration";
import MakeModel from "./commands/make/Model";
import MakeNotification from "./commands/make/Notification";
import MakeObserver from "./commands/make/Observer";
import MakePolicy from "./commands/make/Policy";
import MakeProvider from "./commands/make/Provider";
import MakeRequest from "./commands/make/Request";
import MakeResource from "./commands/make/Resource";
import MakeRule from "./commands/make/Rule";
import MakeSeeder from "./commands/make/Seeder";
import MakeTest from "./commands/make/Test";
import MigrateFresh from "./commands/migrate/Fresh";
import MigrateInstall from "./commands/migrate/Install";
import MigrateRefresh from "./commands/migrate/Refresh";
import MigrateReset from "./commands/migrate/Reset";
import MigrateRollback from "./commands/migrate/Rollback";
import MigrateStatus from "./commands/migrate/Status";
import RouteCache from "./commands/route/Cache";
import RouteCacheClear from "./commands/route/Clear";
import RouteList from "./commands/route/List";
import RouteCacheRefresh from "./commands/route/Refresh";
import RunCommand from "./commands/run/Command";
import ViewClear from "./commands/view/Clear";

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

    const registeredCommands: vscode.Disposable[] = [
        { name: "clearCompiled", action: ClearCompiled },
        { name: "migrate", action: Migrate },
        { name: "optimize", action: Optimize },
        { name: "startServer", action: Server },
        {
            name: "startServerUseDefaults",
            action: Server,
            method: "run",
            args: [true],
        },
        { name: "stopServer", action: Server, method: "stop" },
        { name: "restartServer", action: Server, method: "restart" },
        { name: "list", action: List },
        { name: "make.auth", action: MakeAuth },
        { name: "make.cast", action: MakeCast },
        { name: "make.channel", action: MakeChannel },
        { name: "make.command", action: MakeCommand },
        { name: "make.controller", action: MakeController },
        { name: "make.component", action: MakeComponent },
        { name: "make.factory", action: MakeFactory },
        { name: "make.event", action: MakeEvent },
        { name: "make.listener", action: MakeListener },
        { name: "make.mail", action: MakeMail },
        { name: "make.job", action: MakeJob },
        { name: "make.middleware", action: MakeMiddleware },
        { name: "make.model", action: MakeModel },
        { name: "make.migration", action: MakeMigration },
        { name: "make.notification", action: MakeNotification },
        { name: "make.observer", action: MakeObserver },
        { name: "make.policy", action: MakePolicy },
        { name: "make.provider", action: MakeProvider },
        { name: "make.request", action: MakeRequest },
        { name: "make.resource", action: MakeResource },
        { name: "make.rule", action: MakeRule },
        { name: "make.seeder", action: MakeSeeder },
        { name: "make.test", action: MakeTest },
        { name: "migrate.install", action: MigrateInstall },
        { name: "migrate.refresh", action: MigrateRefresh },
        { name: "migrate.reset", action: MigrateReset },
        { name: "migrate.rollback", action: MigrateRollback },
        { name: "migrate.status", action: MigrateStatus },
        { name: "migrate.fresh", action: MigrateFresh },
        { name: "cache.clear", action: CacheClear },
        { name: "cache.table", action: CacheTable },
        { name: "route.cache", action: RouteCache },
        { name: "route.clear", action: RouteCacheClear },
        { name: "route.refresh", action: RouteCacheRefresh },
        { name: "route.list", action: RouteList },
        { name: "config.cache", action: ConfigCache },
        { name: "config.clear", action: ConfigCacheClear },
        { name: "config.refresh", action: ConfigCacheRefresh },
        { name: "key.generate", action: KeyGenerate },
        { name: "event.generate", action: EventGenerate },
        { name: "view.clear", action: ViewClear },
        { name: "run.command", action: RunCommand },
    ].map((command) => {
        return vscode.commands.registerCommand(command.name, async () => {
            // Setup the call
            const method = command.method ?? "run";
            const args = command.args ?? [];

            command.name = `artisan.${command.name}`;

            // Run the command
            // @ts-ignore
            await command.action[method](...args);
        });
    });

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
