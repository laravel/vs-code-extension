"use strict";

import { renameFileProvider as bladeComponent } from "@src/features/bladeComponent";
import { RenameFileProvider as RenameFileProviderType } from "@src/index";
import { config as getConfig } from "@src/support/config";
import { GeneratedConfigKey } from "@src/support/generated-config";
import * as vscode from "vscode";

const allProviders: Partial<
    Record<GeneratedConfigKey, RenameFileProviderType>
> = {
    "bladeComponent.renameFile": bladeComponent,
};

export const renameFileProviders = Object.entries(allProviders).map(
    ([configKey, provider]) => ({
        provideRenameFile(
            event: vscode.FileRenameEvent,
        ): vscode.ProviderResult<void> {
            // if (!getConfig(configKey as GeneratedConfigKey, true)) {
            //     return;
            // }

            return provider(event);
        },
    }),
);
