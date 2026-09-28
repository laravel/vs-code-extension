import * as vscode from "vscode";
import { runArtisanCommand } from "@src/commands/artisan.js";

import { CastMakeCommand } from "./commands/CastMakeCommand.js";
import { ChannelMakeCommand } from "./commands/ChannelMakeCommand.js";
import { ClassMakeCommand } from "./commands/ClassMakeCommand.js";
import { CommandMakeCommand } from "./commands/CommandMakeCommand.js";
import { ComponentMakeCommand } from "./commands/ComponentMakeCommand.js";
import { ControllerMakeCommand } from "./commands/ControllerMakeCommand.js";
import { EnumMakeCommand } from "./commands/EnumMakeCommand.js";
import { EventMakeCommand } from "./commands/EventMakeCommand.js";
import { ExceptionMakeCommand } from "./commands/ExceptionMakeCommand.js";
import { FactoryMakeCommand } from "./commands/FactoryMakeCommand.js";
import { InterfaceMakeCommand } from "./commands/InterfaceMakeCommand.js";
import { JobMakeCommand } from "./commands/JobMakeCommand.js";
import { JobMiddlewareMakeCommand } from "./commands/JobMiddlewareMakeCommand.js";
import { ListenerMakeCommand } from "./commands/ListenerMakeCommand.js";
import { LivewireMakeCommand } from "./commands/LivewireMakeCommand.js";
import { MailMakeCommand } from "./commands/MailMakeCommand.js";
import { MiddlewareMakeCommand } from "./commands/MiddlewareMakeCommand.js";
import { MigrationMakeCommand } from "./commands/MigrationMakeCommand.js";
import { ModelMakeCommand } from "./commands/ModelMakeCommand.js";
import { NotificationMakeCommand } from "./commands/NotificationMakeCommand.js";
import { ObserverMakeCommand } from "./commands/ObserverMakeCommand.js";
import { PolicyMakeCommand } from "./commands/PolicyMakeCommand.js";
import { ProviderMakeCommand } from "./commands/ProviderMakeCommand.js";
import { RequestMakeCommand } from "./commands/RequestMakeCommand.js";
import { ResourceMakeCommand } from "./commands/ResourceMakeCommand.js";
import { ScopeMakeCommand } from "./commands/ScopeMakeCommand.js";
import { SeederMakeCommand } from "./commands/SeederMakeCommand.js";
import { TestMakeCommand } from "./commands/TestMakeCommand.js";
import { TraitMakeCommand } from "./commands/TraitMakeCommand.js";
import { ViewMakeCommand } from "./commands/ViewMakeCommand.js";
import { MigrateCommand } from "./commands/MigrateCommand.js";
import { MigrateFreshCommand } from "./commands/MigrateFreshCommand.js";
import { MigrateRefreshCommand } from "./commands/MigrateRefreshCommand.js";
import { MigrateRollbackCommand } from "./commands/MigrateRollbackCommand.js";
import { MigrateStatusCommand } from "./commands/MigrateStatusCommand.js";
import { TinkerCommand } from "./commands/TinkerCommand.js";
import { DbCommand } from "./commands/DbCommand.js";
import { RouteListCommand } from "./commands/RouteListCommand.js";
import { DbShowCommand } from "./commands/DbShowCommand.js";
import { PailCommand } from "./commands/PailCommand.js";
import { AuthClearResetsCommand } from "./commands/AuthClearResetsCommand.js";
import { DbSeedCommand } from "./commands/DbSeedCommand.js";
import { DbTableCommand } from "./commands/DbTableCommand.js";
import { DbWipeCommand } from "./commands/DbWipeCommand.js";
import { EventListCommand } from "./commands/EventListCommand.js";
import { KeyGenerateCommand } from "./commands/KeyGenerateCommand.js";
import { ModelShowCommand } from "./commands/ModelShowCommand.js";
import { PestDatasetCommand } from "./commands/PestDatasetCommand.js";
import { QueueClearCommand } from "./commands/QueueClearCommand.js";
import { QueueFailedCommand } from "./commands/QueueFailedCommand.js";
import { QueueFlushCommand } from "./commands/QueueFlushCommand.js";
import { QueueForgetCommand } from "./commands/QueueForgetCommand.js";
import { QueueRetryCommand } from "./commands/QueueRetryCommand.js";
import { ScheduleListCommand } from "./commands/ScheduleListCommand.js";
import { ScheduleTestCommand } from "./commands/ScheduleTestCommand.js";
import { SchemaDumpCommand } from "./commands/SchemaDumpCommand.js";
import { WayfinderGenerateCommand } from "./commands/WayfinderGenerateCommand.js";
import { CacheClearCommand } from "./commands/CacheClearCommand.js";
import { VendorPublishCommand } from "./commands/VendorPublishCommand.js";

const artisanMakeCommands = {
    "laravel.artisan.make.cast": CastMakeCommand,
    "laravel.artisan.make.channel": ChannelMakeCommand,
    "laravel.artisan.make.class": ClassMakeCommand,
    "laravel.artisan.make.command": CommandMakeCommand,
    "laravel.artisan.make.component": ComponentMakeCommand,
    "laravel.artisan.make.controller": ControllerMakeCommand,
    "laravel.artisan.make.enum": EnumMakeCommand,
    "laravel.artisan.make.event": EventMakeCommand,
    "laravel.artisan.make.exception": ExceptionMakeCommand,
    "laravel.artisan.make.factory": FactoryMakeCommand,
    "laravel.artisan.make.interface": InterfaceMakeCommand,
    "laravel.artisan.make.job": JobMakeCommand,
    "laravel.artisan.make.job-middleware": JobMiddlewareMakeCommand,
    "laravel.artisan.make.listener": ListenerMakeCommand,
    "laravel.artisan.make.livewire": LivewireMakeCommand,
    "laravel.artisan.make.mail": MailMakeCommand,
    "laravel.artisan.make.middleware": MiddlewareMakeCommand,
    "laravel.artisan.make.migration": MigrationMakeCommand,
    "laravel.artisan.make.model": ModelMakeCommand,
    "laravel.artisan.make.notification": NotificationMakeCommand,
    "laravel.artisan.make.observer": ObserverMakeCommand,
    "laravel.artisan.make.policy": PolicyMakeCommand,
    "laravel.artisan.make.provider": ProviderMakeCommand,
    "laravel.artisan.make.request": RequestMakeCommand,
    "laravel.artisan.make.resource": ResourceMakeCommand,
    "laravel.artisan.make.scope": ScopeMakeCommand,
    "laravel.artisan.make.seeder": SeederMakeCommand,
    "laravel.artisan.make.test": TestMakeCommand,
    "laravel.artisan.make.trait": TraitMakeCommand,
    "laravel.artisan.make.view": ViewMakeCommand,
};

export const registerArtisanMakeCommands = () => {
    return Object.entries(artisanMakeCommands).map(([name, command]) => {
        return vscode.commands.registerCommand(name, (uri: vscode.Uri) => {
            runArtisanCommand(command, uri);
        });
    });
};

const artisanCommands = {
    "laravel.artisan.migrate": MigrateCommand,
    "laravel.artisan.migrateFresh": MigrateFreshCommand,
    "laravel.artisan.migrateRefresh": MigrateRefreshCommand,
    "laravel.artisan.migrateRollback": MigrateRollbackCommand,
    "laravel.artisan.migrateStatus": MigrateStatusCommand,
    "laravel.artisan.tinker": TinkerCommand,
    "laravel.artisan.db": DbCommand,
    "laravel.artisan.dbShow": DbShowCommand,
    "laravel.artisan.dbSeed": DbSeedCommand,
    "laravel.artisan.dbTable": DbTableCommand,
    "laravel.artisan.dbWipe": DbWipeCommand,
    "laravel.artisan.pail": PailCommand,
    "laravel.artisan.authClearResets": AuthClearResetsCommand,
    "laravel.artisan.eventList": EventListCommand,
    "laravel.artisan.keyGenerate": KeyGenerateCommand,
    "laravel.artisan.modelShow": ModelShowCommand,
    "laravel.artisan.pestDataset": PestDatasetCommand,
    "laravel.artisan.queueClear": QueueClearCommand,
    "laravel.artisan.queueFailed": QueueFailedCommand,
    "laravel.artisan.queueFlush": QueueFlushCommand,
    "laravel.artisan.queueForget": QueueForgetCommand,
    "laravel.artisan.queueRetry": QueueRetryCommand,
    "laravel.artisan.routeList": RouteListCommand,
    "laravel.artisan.scheduleList": ScheduleListCommand,
    "laravel.artisan.scheduleTest": ScheduleTestCommand,
    "laravel.artisan.schemaDump": SchemaDumpCommand,
    "laravel.artisan.wayfinderGenerate": WayfinderGenerateCommand,
    "laravel.artisan.cacheClear": CacheClearCommand,
    "laravel.artisan.vendorPublish": VendorPublishCommand,
};

export const registerArtisanCommands = () => {
    return Object.entries(artisanCommands).map(([name, command]) => {
        return vscode.commands.registerCommand(name, (uri: vscode.Uri) => {
            runArtisanCommand(command, uri);
        });
    });
};
