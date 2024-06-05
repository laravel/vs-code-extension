"use strict";

import {
    DocumentLink,
    ProviderResult,
    TextDocument,
    DocumentLinkProvider as vsDocumentLinkProvider,
} from "vscode";
import { LinkProvider } from "..";

export default class Link implements vsDocumentLinkProvider {
    private providers: LinkProvider[] = [];

    registerProvider(provider: LinkProvider) {
        this.providers.push(provider);
    }

    public provideDocumentLinks(
        doc: TextDocument,
    ): ProviderResult<DocumentLink[]> {
        return this.providers.flatMap((provider) => provider(doc));
    }
}
