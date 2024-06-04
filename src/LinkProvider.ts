"use strict";

import {
    DocumentLink,
    Position,
    ProviderResult,
    Range,
    TextDocument,
    Uri,
    DocumentLinkProvider as vsDocumentLinkProvider,
} from "vscode";
import { getConfigs } from "./repositories/configs";
import { getInertiaViews } from "./repositories/inertia";
import { getViews } from "./repositories/views";

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
        let toCheck = [
            "view",
            "markdown",
            "assertViewIs",
            "@include",
            "@extends",
            "@component",
            // TODO: Deal with aliases
            "View::make",
        ].map((item) => `${item}\\(['"]`);

        let regex = `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;

        return this.findInDoc(doc, regex, (match) => {
            return getViews()[match[0]]?.uri ?? null;
        });
    }

    private getInertiaLinks(doc: TextDocument): DocumentLink[] {
        let toCheck = ["Inertia::(?:render|modal)"].map(
            (item) => `${item}\\(['"]`,
        );

        let regex = `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;

        return this.findInDoc(doc, regex, (match) => {
            return getInertiaViews()[match[0]]?.uri ?? null;
        });
    }

    private getConfigLinks(doc: TextDocument): DocumentLink[] {
        let toCheck = ["config", "Config::get"].map((item) => `${item}\\(['"]`);

        let regex = `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;

        return this.findInDoc(doc, regex, (match) => {
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
        let documentLinks: DocumentLink[] = [];
        let newRegex = new RegExp(regex, "g");

        let index = 0;

        while (index < doc.lineCount) {
            let line = doc.lineAt(index);
            let match = newRegex.exec(line.text);

            if (match !== null) {
                let item = getItem(match);

                if (item === null) {
                    continue;
                }

                let start = new Position(line.lineNumber, match.index);
                let end = start.translate(0, match[0].length);
                let documentlink = new DocumentLink(
                    new Range(start, end),
                    item,
                );

                documentLinks.push(documentlink);
            }

            index++;
        }

        return documentLinks;
    }
}
