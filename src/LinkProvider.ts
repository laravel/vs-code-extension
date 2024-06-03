"use strict";

import {
    DocumentLinkProvider as vsDocumentLinkProvider,
    TextDocument,
    ProviderResult,
    DocumentLink,
    workspace,
    Position,
    Range,
} from "vscode";
import Logger from "./Logger";
import ViewRegistry from "./ViewRegistry";

export default class LinkProvider implements vsDocumentLinkProvider {
    public provideDocumentLinks(
        doc: TextDocument,
    ): ProviderResult<DocumentLink[]> {
        return this.getViewLinks(doc);
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
            "Inertia::(?:render|modal)",
        ].map((item) => `${item}\\(['"]`);

        let regex = `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;

        Logger.info("regex", regex);

        return this.findInDoc(doc, regex);
    }

    private findInDoc(doc: TextDocument, regex: string): DocumentLink[] {
        let documentLinks: DocumentLink[] = [];
        let newRegex = new RegExp(regex, "g");

        let index = 0;

        while (index < doc.lineCount) {
            let line = doc.lineAt(index);
            let match = newRegex.exec(line.text);

            // Logger.info("match", match, line.text);

            if (match !== null && ViewRegistry.views[match[0]] !== undefined) {
                let view = ViewRegistry.views[match[0]];
                let start = new Position(line.lineNumber, match.index);
                let end = start.translate(0, match[0].length);
                let documentlink = new DocumentLink(
                    new Range(start, end),
                    view.uri,
                );

                documentLinks.push(documentlink);
            }

            index++;
        }

        return documentLinks;
    }
}
