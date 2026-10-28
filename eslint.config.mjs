import { defineConfig, globalIgnores } from "eslint/config";
import ts from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
    globalIgnores(["out/", "dist/", ".vscode-test/", "src/test/fixtures/"]),
    prettier,
    {
        languageOptions: {
            globals: globals.node,
        },
        rules: {
            curly: "warn",
            eqeqeq: "warn",
            "no-throw-literal": "warn",
        },
    },
    {
        files: ["**/*.ts"],
        plugins: {
            "@typescript-eslint": ts.plugin,
        },
        languageOptions: {
            parser: ts.parser,
        },
        rules: {
            "@typescript-eslint/naming-convention": [
                "warn",
                {
                    selector: "import",
                    format: ["camelCase", "PascalCase"],
                },
            ],
        },
    },
    {
        files: ["src/test/**/*.ts"],
        languageOptions: {
            globals: globals.mocha,
        },
    },
]);
