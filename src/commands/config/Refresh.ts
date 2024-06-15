import Common from "../../Common";
import cp = require("child_process");

import ConfigCache from "./Cache";
import ConfigClear from "./Clear";

export default class ConfigCacheRefresh extends Common {
    public static async run() {
        await ConfigClear.run();
        await ConfigCache.run();
    }
}
