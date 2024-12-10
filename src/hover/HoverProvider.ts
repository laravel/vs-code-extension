"use strict";

import { hoverProvider as appBinding } from "@src/features/appBinding";
import { hoverProvider as auth } from "@src/features/auth";
import { hoverProvider as config } from "@src/features/config";
import { hoverProvider as env } from "@src/features/env";
import { hoverProvider as inertia } from "@src/features/inertia";
import { hoverProvider as middleware } from "@src/features/middleware";
import { hoverProvider as mix } from "@src/features/mix";
import { hoverProvider as route } from "@src/features/route";
import { hoverProvider as translation } from "@src/features/translation";
import { hoverProvider as view } from "@src/features/view";
import { config as getConfig } from "@src/support/config";
import { GeneratedConfigKey } from "@src/support/generated-config";
import {
    Hover,
    HoverProvider,
    Position,
    ProviderResult,
    TextDocument,
} from "vscode";
import { HoverProvider as ProviderFunc } from "..";

const allProviders: Partial<Record<GeneratedConfigKey, ProviderFunc>> = {
    "appBinding.hover": appBinding,
    "auth.hover": auth,
    "config.hover": config,
    "env.hover": env,
    "inertia.hover": inertia,
    "middleware.hover": middleware,
    "mix.hover": mix,
    "route.hover": route,
    "translation.hover": translation,
    "view.hover": view,
};

export const hoverProviders: HoverProvider[] = Object.entries(allProviders).map(
    ([configKey, provider]) => ({
        provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
            if (!getConfig(configKey as GeneratedConfigKey, true)) {
                return null;
            }

            return provider(doc, pos);
        },
    }),
);
