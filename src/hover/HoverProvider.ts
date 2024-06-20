"use strict";

import {
    Hover,
    Position,
    ProviderResult,
    TextDocument,
    HoverProvider as vsHoverProvider,
} from "vscode";
import { HoverProvider as ProviderFunc } from "..";
import appBinding from "./appBinding";
import auth from "./auth";
import config from "./config";
import env from "./env";
import inertia from "./inertia";
import mix from "./mix";
import route from "./route";
import translation from "./translation";
import view from "./view";

export default class HoverProvider implements vsHoverProvider {
    private providers: ProviderFunc[] = [
        appBinding,
        auth,
        config,
        env,
        inertia,
        mix,
        route,
        translation,
        view,
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
