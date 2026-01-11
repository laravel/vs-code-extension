import fs from "fs";
import * as vscode from "vscode";
import { repository } from ".";
import {
    ideHelperPath,
    projectPathExists,
    projectPath,
} from "../support/project";
import { config } from "../support/config";
import { indent } from "../support/util";
import { detect } from "../support/parser";
import { AutocompleteParsingResult } from "../types";
import { error } from "../support/logger";

interface TestCaseExtension {
    testCase: string;
    traits: string[];
    directory: string | null;
}

interface PestConfig {
    hasPest: boolean;
    expectations: string[];
    testCaseExtensions: TestCaseExtension[];
}

const PEST_FUNCTIONS_CONTENT = `
use Pest\\Concerns\\Expectable;
use Pest\\PendingCalls\\BeforeEachCall;
use Pest\\PendingCalls\\TestCall;
use Pest\\Support\\HigherOrderTapProxy;
use Tests\\TestCase;

/**
 * Runs the given closure before all tests in the current file.
 *
 * @param-closure-this TestCase  $closure
 */
function beforeAll(Closure $closure): void {}

/**
 * Runs the given closure before each test in the current file.
 *
 * @param-closure-this TestCase  $closure
 *
 * @return HigherOrderTapProxy<Expectable|TestCall|TestCase>|Expectable|TestCall|TestCase|mixed
 *
 * @disregard P1075 Not all paths return a value.
 */
function beforeEach(?Closure $closure = null): BeforeEachCall {}

/**
 * Adds the given closure as a test. The first argument
 * is the test description; the second argument is
 * a closure that contains the test expectations.
 *
 * @param-closure-this TestCase  $closure
 *
 * @return Expectable|TestCall|TestCase|mixed
 *
 * @disregard P1075 Not all paths return a value.
 */
function test(?string $description = null, ?Closure $closure = null): HigherOrderTapProxy|TestCall {}

/**
 * Adds the given closure as a test. The first argument
 * is the test description; the second argument is
 * a closure that contains the test expectations.
 *
 * @param-closure-this TestCase  $closure
 *
 * @return Expectable|TestCall|TestCase|mixed
 *
 * @disregard P1075 Not all paths return a value.
 */
function it(string $description, ?Closure $closure = null): TestCall {}
`;

const INACTIVE_PEST_CONFIG: PestConfig = {
    hasPest: false,
    expectations: [],
    testCaseExtensions: [],
};

const generateExpectationClass = (expectations: string[]): string => {
    if (expectations.length === 0) {
        return "";
    }

    const methodBlocks = expectations
        .map((expectation) => ` * @method self ${expectation}()`)
        .sort();

    return [
        "/**",
        " * Pest\\Expectation",
        " *",
        ...methodBlocks,
        " */",
        "class Expectation {}",
    ]
        .map((line) => indent(line))
        .join("\n");
};

const generateTestCaseClass = (extension: TestCaseExtension): string => {
    const parts = extension.testCase.split("\\");
    const className = parts.pop() || "";

    const traitUses =
        extension.traits.length > 0
            ? extension.traits
                  .map((trait) => {
                      const traitName = trait.startsWith("\\")
                          ? trait
                          : `\\${trait}`;
                      return `use ${traitName};`;
                  })
                  .map((line) => indent(line))
                  .join("\n")
            : "";

    const classContent = traitUses
        ? `class ${className}\n{\n${traitUses}\n}`
        : `class ${className} {}`;

    return classContent
        .split("\n")
        .map((line) => indent(line))
        .join("\n");
};

const extractArgumentValue = (
    arg: AutocompleteParsingResult.Argument,
    type: "class" | "string",
): string | null => {
    if (arg.children.length === 0) {
        return null;
    }

    const value = arg.children[0];

    if (type === "class") {
        return value.type === "methodCall" && value.className
            ? value.className
            : value.type === "string"
              ? value.value
              : null;
    }

    return value.type === "string" ? value.value : null;
};

const parsePestConfig = (
    detected: AutocompleteParsingResult.ContextValue[],
): PestConfig => {
    const expectations: string[] = [];
    const traits: string[] = [];
    let testCase: string | null = null;
    let directory: string | null = null;

    for (const item of detected) {
        if (item.type !== "methodCall") {
            continue;
        }

        const methodCall = item;
        const args = methodCall.arguments?.children || [];
        const { className, methodName } = methodCall;

        if (
            className === "expect" &&
            methodName === "extend" &&
            args.length > 0
        ) {
            const expectationName = extractArgumentValue(
                args[0] as AutocompleteParsingResult.Argument,
                "string",
            );
            if (expectationName) {
                expectations.push(expectationName);
            }
        }

        if (className === "pest") {
            switch (methodName) {
                case "extend":
                    if (args.length > 0) {
                        testCase = extractArgumentValue(
                            args[0] as AutocompleteParsingResult.Argument,
                            "class",
                        );
                    }
                    break;
                case "use":
                    for (const arg of args) {
                        const traitName = extractArgumentValue(
                            arg as AutocompleteParsingResult.Argument,
                            "class",
                        );
                        if (traitName) {
                            traits.push(traitName);
                        }
                    }
                    break;
                case "in":
                    if (args.length > 0) {
                        directory = extractArgumentValue(
                            args[0] as AutocompleteParsingResult.Argument,
                            "string",
                        );
                    }
                    break;
            }
        }
    }

    return {
        hasPest: true,
        expectations,
        testCaseExtensions: testCase ? [{ testCase, traits, directory }] : [],
    };
};

const generatePestHelpers = (config: PestConfig) => {
    if (!config.hasPest) {
        return;
    }

    const namespaces: { [namespace: string]: string[] } = {};

    if (config.expectations.length > 0) {
        namespaces["Pest"] = [generateExpectationClass(config.expectations)];
    }

    for (const extension of config.testCaseExtensions) {
        const parts = extension.testCase.split("\\");
        const className = parts.pop() || "";
        const namespace = parts.join("\\");

        if (!namespace || !className) {
            continue;
        }

        if (!namespaces[namespace]) {
            namespaces[namespace] = [];
        }

        namespaces[namespace].push(generateTestCaseClass(extension));
    }

    const content = Object.entries(namespaces)
        .map(([namespace, classes]) => {
            return `namespace ${namespace} {\n\n${classes.join("\n\n")}\n\n}`;
        })
        .join("\n\n");

    const finalContent = `<?php\n\nnamespace {\n${PEST_FUNCTIONS_CONTENT}\n}\n\n${content}\n`;

    fs.writeFileSync(ideHelperPath("_pest.php"), finalContent);
};

const load = async (): Promise<PestConfig> => {
    if (!config<boolean>("pest.generateHelpers", true)) {
        return INACTIVE_PEST_CONFIG;
    }

    if (!projectPathExists("vendor/pestphp/pest")) {
        return INACTIVE_PEST_CONFIG;
    }

    const pestFilePath = projectPath("tests/Pest.php");
    if (!fs.existsSync(pestFilePath)) {
        return INACTIVE_PEST_CONFIG;
    }

    try {
        const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.file(pestFilePath),
        );
        const detected = await detect(doc);

        if (!detected?.length) {
            return { ...INACTIVE_PEST_CONFIG, hasPest: true };
        }

        const pestConfig = parsePestConfig(detected);
        generatePestHelpers(pestConfig);
        return pestConfig;
    } catch (err) {
        error(`Failed to parse Pest.php: ${err}`);
        return { ...INACTIVE_PEST_CONFIG, hasPest: true };
    }
};

export const getPestConfig = repository<PestConfig>({
    load,
    pattern: "tests/Pest.php",
    itemsDefault: INACTIVE_PEST_CONFIG,
});
