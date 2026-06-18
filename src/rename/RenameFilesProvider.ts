"use strict";

import { renameFilesProvider as bladeComponent } from "@src/features/bladeComponent";
import { renameFilesProvider as livewireComponent } from "@src/features/livewireComponent";
import { RenameFilesProvider as RenameFilesProviderType } from "@src/index";
import { config as getConfig } from "@src/support/config";
import { GeneratedConfigKey } from "@src/support/generated-config";

const allProviders: Partial<
    Record<GeneratedConfigKey, RenameFilesProviderType>
> = {
    "bladeComponent.rename": bladeComponent,
    "livewireComponent.rename": livewireComponent,
};

export const renameFilesProviders: RenameFilesProviderType[] = Object.entries(
    allProviders,
)
    .map(([configKey, provider]) => {
        if (!getConfig(configKey as GeneratedConfigKey, true)) {
            return;
        }

        return provider;
    })
    .filter((provider) => provider !== undefined);
