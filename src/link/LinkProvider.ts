"use strict";

import {
    DocumentLink,
    ProviderResult,
    TextDocument,
    DocumentLinkProvider as vsDocumentLinkProvider,
} from "vscode";
import { LinkProvider as LinkProviderType } from "..";
import appBinding from "./appBinding";
import asset from "./asset";
import config from "./config";
import controllerAction from "./controllerAction";
import env from "./env";
import inertia from "./inertia";
import mix from "./mix";
import route from "./route";
import translation from "./translation";
import view from "./view";

export default class LinkProvider implements vsDocumentLinkProvider {
    private providers: LinkProviderType[] = [
        config,
        view,
        inertia,
        appBinding,
        env,
        asset,
        mix,
        translation,
        route,
        controllerAction,
    ];

    public provideDocumentLinks(
        doc: TextDocument,
    ): ProviderResult<DocumentLink[]> {
        return this.providers.flatMap((provider) => provider(doc));
    }
}
