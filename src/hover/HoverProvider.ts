"use strict";

import {
    Hover,
    MarkdownString,
    Position,
    ProviderResult,
    TextDocument,
    HoverProvider as vsHoverProvider,
} from "vscode";
import { getConfigs } from "../repositories/configs";
import { getInertiaViews } from "../repositories/inertia";
import { getViews } from "../repositories/views";
import { info } from "../support/logger";
import {
    configMatchRegex,
    inertiaMatchRegex,
    viewMatchRegex,
} from "../support/patterns";
import { relativePath } from "../support/project";

export default class HoverProvider implements vsHoverProvider {
    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        return (
            this.configHover(doc, pos) ??
            this.viewHover(doc, pos) ??
            this.inertiaHover(doc, pos)
        );
    }

    private configHover(
        doc: TextDocument,
        pos: Position,
    ): ProviderResult<Hover> | null {
        return this.getMatch(doc, pos, configMatchRegex, (match) => {
            const item = getConfigs().find((config) => config.name === match);

            if (!item || !item.uri) {
                return null;
            }

            return new Hover(
                new MarkdownString(
                    `${item.value}\n\n[${relativePath(item.uri.path)}](${
                        item.uri.fsPath
                    })`,
                ),
            );
        });
    }

    private viewHover(
        doc: TextDocument,
        pos: Position,
    ): ProviderResult<Hover> | null {
        return this.getMatch(doc, pos, viewMatchRegex, (match) => {
            const item = getViews()[match];

            if (!item) {
                return null;
            }

            return new Hover(
                new MarkdownString(
                    `[${relativePath(item.uri.path)}](${item.uri.fsPath})`,
                ),
            );
        });
    }

    private inertiaHover(
        doc: TextDocument,
        pos: Position,
    ): ProviderResult<Hover> | null {
        return this.getMatch(doc, pos, inertiaMatchRegex, (match) => {
            info("inertiaMatchRegex:", match);

            const item = getInertiaViews()[match];

            if (!item) {
                return null;
            }

            return new Hover(
                new MarkdownString(
                    `[${relativePath(item.uri.path)}](${item.uri.fsPath})`,
                ),
            );
        });
    }

    private getMatch(
        doc: TextDocument,
        pos: Position,
        regex: string,
        cb: (match: string) => ProviderResult<Hover> | null,
    ): ProviderResult<Hover> | null {
        const linkRange = doc.getWordRangeAtPosition(pos, new RegExp(regex));

        if (!linkRange) {
            return null;
        }

        return cb(doc.getText(linkRange));
    }
}
