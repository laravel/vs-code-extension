"use strict";

import { hoverProvider as appBinding } from "@/features/appBinding";
import { hoverProvider as auth } from "@/features/auth";
import { hoverProvider as config } from "@/features/config";
import { hoverProvider as env } from "@/features/env";
import { hoverProvider as inertia } from "@/features/inertia";
import { hoverProvider as mix } from "@/features/mix";
import { hoverProvider as route } from "@/features/route";
import { hoverProvider as translation } from "@/features/translation";
import { hoverProvider as view } from "@/features/view";
import { config as getConfig } from "@/support/config";
import { ConfigKey } from "@/support/generated-config";
import {
    Hover,
    Position,
    ProviderResult,
    TextDocument,
    HoverProvider as vsHoverProvider,
} from "vscode";
import { HoverProvider as ProviderFunc } from "..";

export default class HoverProvider implements vsHoverProvider {
    private providers: {
        provider: ProviderFunc;
        configKey: ConfigKey;
    }[] = [
        { provider: appBinding, configKey: "appBinding.hover" },
        { provider: auth, configKey: "auth.hover" },
        { provider: config, configKey: "config.hover" },
        { provider: env, configKey: "env.hover" },
        { provider: inertia, configKey: "inertia.hover" },
        { provider: mix, configKey: "mix.hover" },
        { provider: route, configKey: "route.hover" },
        { provider: translation, configKey: "translation.hover" },
        { provider: view, configKey: "view.hover" },
    ];

    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        for (const provider of this.providers) {
            if (!getConfig(provider.configKey, true)) {
                continue;
            }

            const hover = provider.provider(doc, pos);

            if (hover) {
                return hover;
            }
        }

        return null;
    }
}
