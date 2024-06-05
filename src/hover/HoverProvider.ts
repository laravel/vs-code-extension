"use strict";

import {
    Hover,
    Position,
    ProviderResult,
    TextDocument,
    HoverProvider as vsHoverProvider,
} from "vscode";
import { HoverProvider as ProviderFunc } from "..";

export default class HoverProvider implements vsHoverProvider {
    private providers: ProviderFunc[] = [];

    registerProvider(provider: ProviderFunc) {
        this.providers.push(provider);
    }

    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        for (const provider of this.providers) {
            const hover = provider(doc, pos);

            if (hover) {
                return hover;
            }
        }

        return null;
    }
}
