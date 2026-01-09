import fs from "fs";
import { repository } from ".";
import { ideHelperPath, projectPathExists } from "../support/project";
import { runInLaravel, template } from "./../support/php";
import { config } from "../support/config";

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

const PEST_FUNCTIONS_CONTENT = `<?php

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

const writePestFunctions = () => {
    fs.writeFileSync(
        ideHelperPath("_pest_function_helpers.php"),
        PEST_FUNCTIONS_CONTENT,
    );
};

const generatePestHelpers = (config: PestConfig) => {
    if (!config.hasPest) {
        return;
    }

    const namespaces: { [namespace: string]: string[] } = {};

    if (config.expectations.length > 0) {
        const methods = config.expectations
            .map((expectation) => `        public function ${expectation}() {}`)
            .join("\n");

        namespaces["Pest"] = [
            `    class Expectation\n    {\n${methods}\n    }`,
        ];
    }

    for (const extension of config.testCaseExtensions) {
        const parts = extension.testCase.split("\\");
        const className = parts.pop() || "";
        const namespace = parts.join("\\");

        if (!namespace || !className) {
            continue;
        }

        const traitUses =
            extension.traits.length > 0
                ? extension.traits
                      .map((trait) => {
                          const traitName = trait.startsWith("\\")
                              ? trait
                              : `\\${trait}`;
                          return `        use ${traitName};`;
                      })
                      .join("\n")
                : "";

        const classContent = traitUses
            ? `    class ${className}\n    {\n${traitUses}\n    }`
            : `    class ${className} {}`;

        if (!namespaces[namespace]) {
            namespaces[namespace] = [];
        }

        namespaces[namespace].push(classContent);
    }

    if (Object.keys(namespaces).length === 0) {
        return;
    }

    const content = Object.entries(namespaces)
        .map(([namespace, classes]) => {
            return `namespace ${namespace} {\n${classes.join("\n\n")}\n}`;
        })
        .join("\n\n");

    const finalContent = `<?php\n\n${content}\n`;

    fs.writeFileSync(ideHelperPath("_pest_class_helpers.php"), finalContent);
};

const load = (): Promise<PestConfig> => {
    if (config<boolean>("pest.generateHelpers", true) === false) {
        return Promise.resolve(INACTIVE_PEST_CONFIG);
    }

    if (!projectPathExists("vendor/pestphp/pest")) {
        return Promise.resolve(INACTIVE_PEST_CONFIG);
    }

    writePestFunctions();

    return runInLaravel<PestConfig>(template("pest"), "Pest Config").then(
        (result) => {
            if (!result) {
                return INACTIVE_PEST_CONFIG;
            }

            generatePestHelpers(result);

            return result;
        },
    );
};

export const getPestConfig = repository<PestConfig>({
    load,
    pattern: "tests/Pest.php",
    itemsDefault: INACTIVE_PEST_CONFIG,
});
