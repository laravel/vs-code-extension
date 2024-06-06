"use strict";

import {
    Hover,
    Position,
    ProviderResult,
    TextDocument,
    HoverProvider as vsHoverProvider,
} from "vscode";
import { HoverProvider as ProviderFunc } from "..";
import appBinding from "./AppBinding";
import config from "./Config";
import env from "./Env";
import inertia from "./Inertia";
import view from "./View";

export default class HoverProvider implements vsHoverProvider {
    private providers: ProviderFunc[] = [
        config,
        view,
        inertia,
        appBinding,
        env,
    ];

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
