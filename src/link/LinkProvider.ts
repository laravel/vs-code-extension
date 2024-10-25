"use strict";

import { linkProvider as appBinding } from "@src/features/appBinding";
import { linkProvider as asset } from "@src/features/asset";
import { linkProvider as auth } from "@src/features/auth";
import { linkProvider as config } from "@src/features/config";
import { linkProvider as controllerAction } from "@src/features/controllerAction";
import { linkProvider as env } from "@src/features/env";
import { linkProvider as inertia } from "@src/features/inertia";
import { linkProvider as middleware } from "@src/features/middleware";
import { linkProvider as mix } from "@src/features/mix";
import { linkProvider as route } from "@src/features/route";
import { linkProvider as translation } from "@src/features/translation";
import { linkProvider as view } from "@src/features/view";
import { LinkProvider as LinkProviderType } from "@src/index";
import { config as getConfig } from "@src/support/config";
import { ConfigKey } from "@src/support/generated-config";
import {
    DocumentLink,
    ProviderResult,
    TextDocument,
    DocumentLinkProvider as vsDocumentLinkProvider,
} from "vscode";

export default class LinkProvider implements vsDocumentLinkProvider {
    private providers: {
        provider: LinkProviderType;
        configKey: ConfigKey;
    }[] = [
        { provider: appBinding, configKey: "appBinding.link" },
        { provider: asset, configKey: "asset.link" },
        { provider: auth, configKey: "auth.link" },
        { provider: config, configKey: "config.link" },
        { provider: controllerAction, configKey: "controllerAction.link" },
        { provider: env, configKey: "env.link" },
        { provider: inertia, configKey: "inertia.link" },
        { provider: middleware, configKey: "middleware.link" },
        { provider: mix, configKey: "mix.link" },
        { provider: route, configKey: "route.link" },
        { provider: translation, configKey: "translation.link" },
        { provider: view, configKey: "view.link" },
    ];

    public provideDocumentLinks(
        doc: TextDocument,
    ): ProviderResult<DocumentLink[]> {
        return this.providers
            .filter((provider) => getConfig(provider.configKey, true))
            .flatMap((provider) => provider.provider(doc));
    }
}
