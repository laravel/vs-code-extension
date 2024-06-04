"use strict";

import {
    DocumentLink,
    ProviderResult,
    TextDocument,
    Uri,
    DocumentLinkProvider as vsDocumentLinkProvider,
} from "vscode";
import { getConfigs } from "../repositories/configs";
import { getInertiaViews } from "../repositories/inertia";
import { getViews } from "../repositories/views";
import { findMatchesInDoc } from "../support/doc";
import {
    configMatchRegex,
    inertiaMatchRegex,
    viewMatchRegex,
} from "../support/patterns";

export default class Link implements vsDocumentLinkProvider {
    public provideDocumentLinks(
        doc: TextDocument,
    ): ProviderResult<DocumentLink[]> {
        return [
            this.getViewLinks(doc),
            this.getInertiaLinks(doc),
            this.getConfigLinks(doc),
        ].flat();
    }

    private getViewLinks(doc: TextDocument): DocumentLink[] {
        return this.findInDoc(doc, viewMatchRegex, (match) => {
            return getViews()[match[0]]?.uri ?? null;
        });
    }

    private getInertiaLinks(doc: TextDocument): DocumentLink[] {
        return this.findInDoc(doc, inertiaMatchRegex, (match) => {
            return getInertiaViews()[match[0]]?.uri ?? null;
        });
    }

    private getConfigLinks(doc: TextDocument): DocumentLink[] {
        return this.findInDoc(doc, configMatchRegex, (match) => {
            return (
                getConfigs().find((item) => item.name === match[0])?.uri ?? null
            );
        });
    }

    private findInDoc(
        doc: TextDocument,
        regex: string,
        getItem: (match: RegExpExecArray) => Uri | null,
    ): DocumentLink[] {
        return findMatchesInDoc(doc, regex, (match, range) => {
            const item = getItem(match);

            if (item === null) {
                return null;
            }

            return new DocumentLink(range, item);
        });
    }
}
