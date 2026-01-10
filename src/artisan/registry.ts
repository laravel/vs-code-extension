import * as vscode from "vscode";
import { runArtisanMakeCommand } from "@src/commands/artisan";

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
            runArtisanMakeCommand(command, uri);
        });
    });
};
