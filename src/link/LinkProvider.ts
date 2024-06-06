"use strict";

import {
    DocumentLink,
    ProviderResult,
    TextDocument,
    DocumentLinkProvider as vsDocumentLinkProvider,
} from "vscode";
import { LinkProvider as LinkProviderType } from "..";
import appBinding from "./AppBinding";
import asset from "./Asset";
import config from "./Config";
import env from "./Env";
import inertia from "./Inertia";
import view from "./View";

export default class LinkProvider implements vsDocumentLinkProvider {
    private providers: LinkProviderType[] = [
        config,
        view,
        inertia,
        appBinding,
        env,
        asset,
    ];

    public provideDocumentLinks(
        doc: TextDocument,
    ): ProviderResult<DocumentLink[]> {
        return this.providers.flatMap((provider) => provider(doc));
    }
}
