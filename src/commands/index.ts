import * as vscode from "vscode";

// import ClearCompiled from "./base/ClearCompiled";
// import List from "./base/List";
// import Migrate from "./base/Migrate";
// import Optimize from "./base/Optimize";
// import Server from "./base/Serve";
import CacheClear from "./cache/Clear";
// import CacheTable from "./cache/Table";
// import ConfigCache from "./config/Cache";
// import ConfigCacheClear from "./config/Clear";
// import ConfigCacheRefresh from "./config/Refresh";
// import EventGenerate from "./event/Generate";
// import KeyGenerate from "./key/Generate";
// import MakeAuth from "./make/Auth";
// import MakeCast from "./make/Cast";
// import MakeChannel from "./make/Channel";
// import MakeCommand from "./make/Command";
// import MakeComponent from "./make/Component";
// import MakeController from "./make/Controller";
// import MakeEvent from "./make/Event";
// import MakeFactory from "./make/Factory";
// import MakeJob from "./make/Job";
// import MakeListener from "./make/Listener";
// import MakeMail from "./make/Mail";
// import MakeMiddleware from "./make/Middleware";
// import MakeMigration from "./make/Migration";
// import MakeModel from "./make/Model";
// import MakeNotification from "./make/Notification";
// import MakeObserver from "./make/Observer";
// import MakePolicy from "./make/Policy";
// import MakeProvider from "./make/Provider";
// import MakeRequest from "./make/Request";
// import MakeResource from "./make/Resource";
// import MakeRule from "./make/Rule";
// import MakeSeeder from "./make/Seeder";
// import MakeTest from "./make/Test";
// import MigrateFresh from "./migrate/Fresh";
// import MigrateInstall from "./migrate/Install";
// import MigrateRefresh from "./migrate/Refresh";
// import MigrateReset from "./migrate/Reset";
// import MigrateRollback from "./migrate/Rollback";
// import MigrateStatus from "./migrate/Status";
// import RouteCache from "./route/Cache";
// import RouteCacheClear from "./route/Clear";
// // import RouteList from "./route/List";
// import RouteCacheRefresh from "./route/Refresh";
// import RunCommand from "./run/Command";
// import ViewClear from "./view/Clear";

export const registeredCommands: vscode.Disposable[] = [
    // { name: "clearCompiled", action: ClearCompiled },
    // { name: "migrate", action: Migrate },
    // { name: "optimize", action: Optimize },
    // { name: "startServer", action: Server },
    // {
    //     name: "startServerUseDefaults",
    //     action: Server,
    //     method: "run",
    //     args: [true],
    // },
    // { name: "stopServer", action: Server, method: "stop" },
    // { name: "restartServer", action: Server, method: "restart" },
    // { name: "list", action: List },
    // { name: "make.auth", action: MakeAuth },
    // { name: "make.cast", action: MakeCast },
    // { name: "make.channel", action: MakeChannel },
    // { name: "make.command", action: MakeCommand },
    // { name: "make.controller", action: MakeController },
    // { name: "make.component", action: MakeComponent },
    // { name: "make.factory", action: MakeFactory },
    // { name: "make.event", action: MakeEvent },
    // { name: "make.listener", action: MakeListener },
    // { name: "make.mail", action: MakeMail },
    // { name: "make.job", action: MakeJob },
    // { name: "make.middleware", action: MakeMiddleware },
    // { name: "make.model", action: MakeModel },
    // { name: "make.migration", action: MakeMigration },
    // { name: "make.notification", action: MakeNotification },
    // { name: "make.observer", action: MakeObserver },
    // { name: "make.policy", action: MakePolicy },
    // { name: "make.provider", action: MakeProvider },
    // { name: "make.request", action: MakeRequest },
    // { name: "make.resource", action: MakeResource },
    // { name: "make.rule", action: MakeRule },
    // { name: "make.seeder", action: MakeSeeder },
    // { name: "make.test", action: MakeTest },
    // { name: "migrate.install", action: MigrateInstall },
    // { name: "migrate.refresh", action: MigrateRefresh },
    // { name: "migrate.reset", action: MigrateReset },
    // { name: "migrate.rollback", action: MigrateRollback },
    // { name: "migrate.status", action: MigrateStatus },
    // { name: "migrate.fresh", action: MigrateFresh },
    { name: "cache.clear", action: CacheClear },
    // { name: "cache.table", action: CacheTable },
    // { name: "route.cache", action: RouteCache },
    // { name: "route.clear", action: RouteCacheClear },
    // { name: "route.refresh", action: RouteCacheRefresh },
    // // { name: "route.list", action: RouteList },
    // { name: "config.cache", action: ConfigCache },
    // { name: "config.clear", action: ConfigCacheClear },
    // { name: "config.refresh", action: ConfigCacheRefresh },
    // { name: "key.generate", action: KeyGenerate },
    // { name: "event.generate", action: EventGenerate },
    // { name: "view.clear", action: ViewClear },
    // { name: "run.command", action: RunCommand },
].map((command) => {
    return vscode.commands.registerCommand(command.name, async () => {
        // Setup the call
        // @ts-ignore
        const method = command.method ?? "run";
        // @ts-ignore
        const args = command.args ?? [];

        command.name = `artisan.${command.name}`;

        // Run the command
        // @ts-ignore
        await command.action[method](...args);
    });
});
