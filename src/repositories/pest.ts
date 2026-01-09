import fs from "fs";
import { repository } from ".";
import { ideHelperPath, projectPathExists } from "../support/project";
import { runInLaravel, template } from "./../support/php";
import { config } from "../support/config";
import { indent } from "../support/util";

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

const load = (): Promise<PestConfig> => {
    if (config<boolean>("pest.generateHelpers", true) === false) {
        return Promise.resolve(INACTIVE_PEST_CONFIG);
    }

    if (!projectPathExists("vendor/pestphp/pest")) {
        return Promise.resolve(INACTIVE_PEST_CONFIG);
    }

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
