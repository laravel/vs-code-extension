import * as vscode from "vscode";
import { runArtisanCommand } from "@src/commands/artisan";

import { CastMakeCommand } from "./commands/CastMakeCommand";
import { ChannelMakeCommand } from "./commands/ChannelMakeCommand";
import { ClassMakeCommand } from "./commands/ClassMakeCommand";
import { CommandMakeCommand } from "./commands/CommandMakeCommand";
import { ComponentMakeCommand } from "./commands/ComponentMakeCommand";
import { ControllerMakeCommand } from "./commands/ControllerMakeCommand";
import { EnumMakeCommand } from "./commands/EnumMakeCommand";
import { EventMakeCommand } from "./commands/EventMakeCommand";
import { ExceptionMakeCommand } from "./commands/ExceptionMakeCommand";
import { FactoryMakeCommand } from "./commands/FactoryMakeCommand";
import { InterfaceMakeCommand } from "./commands/InterfaceMakeCommand";
import { JobMakeCommand } from "./commands/JobMakeCommand";
import { JobMiddlewareMakeCommand } from "./commands/JobMiddlewareMakeCommand";
import { ListenerMakeCommand } from "./commands/ListenerMakeCommand";
import { LivewireMakeCommand } from "./commands/LivewireMakeCommand";
import { MailMakeCommand } from "./commands/MailMakeCommand";
import { MiddlewareMakeCommand } from "./commands/MiddlewareMakeCommand";
import { MigrationMakeCommand } from "./commands/MigrationMakeCommand";
import { ModelMakeCommand } from "./commands/ModelMakeCommand";
import { NotificationMakeCommand } from "./commands/NotificationMakeCommand";
import { ObserverMakeCommand } from "./commands/ObserverMakeCommand";
import { PolicyMakeCommand } from "./commands/PolicyMakeCommand";
import { ProviderMakeCommand } from "./commands/ProviderMakeCommand";
import { RequestMakeCommand } from "./commands/RequestMakeCommand";
import { ResourceMakeCommand } from "./commands/ResourceMakeCommand";
import { ScopeMakeCommand } from "./commands/ScopeMakeCommand";
import { SeederMakeCommand } from "./commands/SeederMakeCommand";
import { TestMakeCommand } from "./commands/TestMakeCommand";
import { TraitMakeCommand } from "./commands/TraitMakeCommand";
import { ViewMakeCommand } from "./commands/ViewMakeCommand";
import { MigrateCommand } from "./commands/MigrateCommand";
import { MigrateFreshCommand } from "./commands/MigrateFreshCommand";
import { MigrateRefreshCommand } from "./commands/MigrateRefreshCommand";
import { MigrateRollbackCommand } from "./commands/MigrateRollbackCommand";
import { MigrateStatusCommand } from "./commands/MigrateStatusCommand";
import { TinkerCommand } from "./commands/TinkerCommand";
import { DbCommand } from "./commands/DbCommand";
import { RouteListCommand } from "./commands/RouteListCommand";
import { DbShowCommand } from "./commands/DbShowCommand";
import { PailCommand } from "./commands/PailCommand";
import { AuthClearResetsCommand } from "./commands/AuthClearResetsCommand";
import { DbSeedCommand } from "./commands/DbSeedCommand";
import { DbTableCommand } from "./commands/DbTableCommand";
import { DbWipeCommand } from "./commands/DbWipeCommand";
import { EventListCommand } from "./commands/EventListCommand";
import { KeyGenerateCommand } from "./commands/KeyGenerateCommand";
import { ModelShowCommand } from "./commands/ModelShowCommand";
import { PestDatasetCommand } from "./commands/PestDatasetCommand";
import { QueueClearCommand } from "./commands/QueueClearCommand";
import { QueueFailedCommand } from "./commands/QueueFailedCommand";
import { QueueFlushCommand } from "./commands/QueueFlushCommand";
import { QueueForgetCommand } from "./commands/QueueForgetCommand";
import { QueueRetryCommand } from "./commands/QueueRetryCommand";
import { ScheduleListCommand } from "./commands/ScheduleListCommand";
import { ScheduleTestCommand } from "./commands/ScheduleTestCommand";
import { SchemaDumpCommand } from "./commands/SchemaDumpCommand";
import { WayfinderGenerateCommand } from "./commands/WayfinderGenerateCommand";
import { CacheClearCommand } from "./commands/CacheClearCommand";
import { VendorPublishCommand } from "./commands/VendorPublishCommand";

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
