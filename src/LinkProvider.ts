"use strict";

import {
    DocumentLinkProvider as vsDocumentLinkProvider,
    TextDocument,
    ProviderResult,
    DocumentLink,
    workspace,
    Position,
    Range,
    Uri,
} from "vscode";
import Logger from "./Logger";
import ViewRegistry from "./ViewRegistry";
import InertiaRegistry from "./InertiaRegistry";

export default class LinkProvider implements vsDocumentLinkProvider {
    public provideDocumentLinks(
        doc: TextDocument,
    ): ProviderResult<DocumentLink[]> {
        return this.getViewLinks(doc).concat(this.getInertiaLinks(doc));
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
            return ViewRegistry.views[match[0]]?.uri ?? null;
        });
    }

    private getInertiaLinks(doc: TextDocument): DocumentLink[] {
        let toCheck = ["Inertia::(?:render|modal)"].map(
            (item) => `${item}\\(['"]`,
        );

        let regex = `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;

        return this.findInDoc(doc, regex, (match) => {
            return InertiaRegistry.views[match[0]]?.uri ?? null;
        });
    }

    private findInDoc(
        doc: TextDocument,
        regex: string,
        getItem: (match: RegExpExecArray) => Uri | null,
    ): DocumentLink[] {
        // Logger.info("regex", regex);
        let documentLinks: DocumentLink[] = [];
        let newRegex = new RegExp(regex, "g");

        let index = 0;

        while (index < doc.lineCount) {
            let line = doc.lineAt(index);
            let match = newRegex.exec(line.text);

            // Logger.info("match", match, line.text);

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
