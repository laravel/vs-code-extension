"use strict";

import {
    DocumentLink,
    ProviderResult,
    TextDocument,
    DocumentLinkProvider as vsDocumentLinkProvider,
} from "vscode";
import { LinkProvider as LinkProviderType } from "..";
import { ConfigKey } from "../support/generated-config";
import { config as getConfig } from "./../support/config";
import appBinding from "./appBinding";
import asset from "./asset";
import auth from "./auth";
import config from "./config";
import controllerAction from "./controllerAction";
import env from "./env";
import inertia from "./inertia";
import mix from "./mix";
import route from "./route";
import translation from "./translation";
import view from "./view";

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
