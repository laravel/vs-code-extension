"use strict";

import { linkProvider as appBinding } from "@src/features/appBinding";
import { linkProvider as asset } from "@src/features/asset";
import { linkProvider as auth } from "@src/features/auth";
import { linkProvider as bladeComponent } from "@src/features/bladeComponent";
import { linkProvider as config } from "@src/features/config";
import { linkProvider as controllerAction } from "@src/features/controllerAction";
import { linkProvider as env } from "@src/features/env";
import { linkProvider as inertia } from "@src/features/inertia";
import { linkProvider as livewireComponent } from "@src/features/livewireComponent";
import { linkProvider as middleware } from "@src/features/middleware";
import { linkProvider as mix } from "@src/features/mix";
import { linkProvider as paths } from "@src/features/paths";
import { linkProvider as route } from "@src/features/route";
import { linkProvider as translation } from "@src/features/translation";
import { linkProvider as view } from "@src/features/view";
import { LinkProvider as LinkProviderType } from "@src/index";
import { config as getConfig } from "@src/support/config";
import { GeneratedConfigKey } from "@src/support/generated-config";
import {
    DocumentLink,
    DocumentLinkProvider,
    ProviderResult,
    TextDocument,
} from "vscode";

const allProviders: Partial<Record<GeneratedConfigKey, LinkProviderType>> = {
    "appBinding.link": appBinding,
    "asset.link": asset,
    "auth.link": auth,
    "bladeComponent.link": bladeComponent,
    "config.link": config,
    "controllerAction.link": controllerAction,
    "env.link": env,
    "inertia.link": inertia,
    "livewireComponent.link": livewireComponent,
    "middleware.link": middleware,
    "mix.link": mix,
    "paths.link": paths,
    "route.link": route,
    "translation.link": translation,
    "view.link": view,
};

export const linkProviders: DocumentLinkProvider[] = Object.entries(
    allProviders,
).map(([configKey, provider]) => ({
    provideDocumentLinks(doc: TextDocument): ProviderResult<DocumentLink[]> {
        if (!getConfig(configKey as GeneratedConfigKey, true)) {
            return [];
        }

        return provider(doc).then((result) => {
            return result.flat().filter((i) => i !== null);
        });
    },
}));
