"use strict";

import { Provider } from ".";

export default class Helpers {
    static classes: string[] = [];

    static registerProvider(provider: Provider) {
        let tags = provider.tags();

        if (tags.classes) {
            this.classes = this.classes.concat(tags.classes);
        }
    }
}
