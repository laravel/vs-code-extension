import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
    files: "out/test/**/*.test.js",
    workspaceFolder: "./src/test/fixtures/laravel-react",
    mocha: {
        ui: "tdd",
        timeout: 20000,
    },
});
