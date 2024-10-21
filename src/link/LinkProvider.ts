"use strict";

import { linkProvider as appBinding } from "@/features/appBinding";
import { linkProvider as asset } from "@/features/asset";
import { linkProvider as auth } from "@/features/auth";
import { linkProvider as config } from "@/features/config";
import { linkProvider as controllerAction } from "@/features/controllerAction";
import { linkProvider as env } from "@/features/env";
import { linkProvider as inertia } from "@/features/inertia";
import { linkProvider as mix } from "@/features/mix";
import { linkProvider as route } from "@/features/route";
import { linkProvider as translation } from "@/features/translation";
import { linkProvider as view } from "@/features/view";
import { LinkProvider as LinkProviderType } from "@/index";
import { config as getConfig } from "@/support/config";
import { ConfigKey } from "@/support/generated-config";
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
