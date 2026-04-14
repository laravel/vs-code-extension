"use strict";

import { renameFilesProvider as bladeComponent } from "@src/features/bladeComponent";
import { renameFilesProvider as livewireComponent } from "@src/features/livewireComponent";
import { RenameFilesProvider as RenameFilesProviderType } from "@src/index";
import { config as getConfig } from "@src/support/config";
import { GeneratedConfigKey } from "@src/support/generated-config";
import * as vscode from "vscode";

const allProviders: Partial<
    Record<GeneratedConfigKey, RenameFilesProviderType>
> = {
    "bladeComponent.renameFile": bladeComponent,
    "livewireComponent.renameFile": livewireComponent,
};

export const renameFilesProviders = Object.entries(allProviders).map(
    ([configKey, provider]) => {
        // if (!getConfig(configKey as GeneratedConfigKey, true)) {
        //     return;
        // }

        return provider;
    },
);
