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
    Position,
    ProviderResult,
    TextDocument,
    HoverProvider as vsHoverProvider,
} from "vscode";
import { HoverProvider as ProviderFunc } from "..";

export default class HoverProvider implements vsHoverProvider {
    private providers: {
        provider: ProviderFunc;
        configKey: GeneratedConfigKey;
    }[] = [
        { provider: appBinding, configKey: "appBinding.hover" },
        { provider: auth, configKey: "auth.hover" },
        { provider: config, configKey: "config.hover" },
        { provider: env, configKey: "env.hover" },
        { provider: inertia, configKey: "inertia.hover" },
        { provider: middleware, configKey: "middleware.hover" },
        { provider: mix, configKey: "mix.hover" },
        { provider: route, configKey: "route.hover" },
        { provider: translation, configKey: "translation.hover" },
        { provider: view, configKey: "view.hover" },
    ];

    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        return Promise.all(
            this.providers
                .filter((provider) => getConfig(provider.configKey, true))
                .map((provider) => provider.provider(doc, pos)),
        ).then((result) => {
            console.log(
                "hover result",
                result.flat().find((i) => i !== null),
            );
            return result.flat().find((i) => i !== null);
        });
    }
}
