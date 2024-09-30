"use strict";

import {
    Hover,
    Position,
    ProviderResult,
    TextDocument,
    HoverProvider as vsHoverProvider,
} from "vscode";
import { HoverProvider as ProviderFunc } from "..";
import { ConfigKey } from "../support/generated-config";
import { config as getConfig } from "./../support/config";
import appBinding from "./appBinding";
import auth from "./auth";
import config from "./config";
import env from "./env";
import inertia from "./inertia";
import mix from "./mix";
import route from "./route";
import translation from "./translation";
import view from "./view";

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
