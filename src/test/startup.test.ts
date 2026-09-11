import { activateExtension } from "./helper";

// A root hook prevents feature tests from running when first-run setup fails.
suiteSetup(async function () {
    // Allow the normal binary download (up to five minutes) and LSP startup.
    this.timeout(360_000);

    await activateExtension();
});
