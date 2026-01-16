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
import { runInLaravel, template } from "../support/php";
import { ClassLike } from "..";

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

const toFQCN = (className: string): string => {
    return className.startsWith("\\") ? className : `\\${className}`;
};

const generatePestFunctionsContent = (testCaseClasses: string[]): string => {
    const normalizedClasses = [...new Set(testCaseClasses.map(toFQCN))];

    const unionType = normalizedClasses.join("|");

    return `
use Pest\\Concerns\\Expectable;
use Pest\\PendingCalls\\BeforeEachCall;
use Pest\\PendingCalls\\TestCall;
use Pest\\Support\\HigherOrderTapProxy;

/**
 * Runs the given closure before all tests in the current file.
 *
 * @param-closure-this ${unionType}  $closure
 */
function beforeAll(Closure $closure): void {}

/**
 * Runs the given closure before each test in the current file.
 *
 * @param-closure-this ${unionType}  $closure
 *
 * @return HigherOrderTapProxy<Expectable|TestCall|${unionType}>|Expectable|TestCall|${unionType}|mixed
 *
 * @disregard P1075 Not all paths return a value.
 */
function beforeEach(?Closure $closure = null): BeforeEachCall {}

/**
 * Adds the given closure as a test. The first argument
 * is the test description; the second argument is
 * a closure that contains the test expectations.
 *
 * @param-closure-this ${unionType}  $closure
 *
 * @return Expectable|TestCall|${unionType}|mixed
 *
 * @disregard P1075 Not all paths return a value.
 */
function test(?string $description = null, ?Closure $closure = null): HigherOrderTapProxy|TestCall {}

/**
 * Adds the given closure as a test. The first argument
 * is the test description; the second argument is
 * a closure that contains the test expectations.
 *
 * @param-closure-this ${unionType}  $closure
 *
 * @return Expectable|TestCall|${unionType}|mixed
 *
 * @disregard P1075 Not all paths return a value.
 */
function it(string $description, ?Closure $closure = null): TestCall {}
`;
};

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

const isExtendingMethod = (methodName: string | null): boolean => {
    if (!methodName) {
        return false;
    }
    return ["extend", "extends", "use", "uses"].includes(methodName);
};

const parsePestConfig = async (
    detected: AutocompleteParsingResult.ContextValue[],
): Promise<PestConfig> => {
    const expectations: string[] = [];
    const testCaseExtensions: TestCaseExtension[] = [];

    let pendingTraits: string[] = [];
    let pendingDirectory: string | null = null;

    for (const item of detected) {
        if (item.type !== "methodCall") {
            continue;
        }

        const methodCall = item;
        const args = methodCall.arguments?.children || [];
        const { className, methodName } = methodCall;

        if (
            className === "expect" &&
            isExtendingMethod(methodName) &&
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
                case "in":
                    if (args.length > 0) {
                        pendingDirectory = extractArgumentValue(
                            args[0] as AutocompleteParsingResult.Argument,
                            "string",
                        );
                    }
                    break;
                case "use":
                case "uses":
                case "extend":
                case "extends":
                    for (const arg of args) {
                        const objectName = extractArgumentValue(
                            arg as AutocompleteParsingResult.Argument,
                            "class",
                        );
                        if (objectName) {
                            const classLike = `${toFQCN(objectName)}::class`;
                            const extensionObjectType =
                                await runInLaravel<ClassLike>(
                                    template("classLikeType", {
                                        classlike: classLike,
                                    }),
                                    "Pest Extension Type Detection",
                                );

                            if (extensionObjectType.type === "trait") {
                                pendingTraits.push(objectName);
                            } else if (extensionObjectType.type === "class") {
                                testCaseExtensions.push({
                                    testCase: objectName,
                                    traits: pendingTraits,
                                    directory: pendingDirectory,
                                });

                                pendingTraits = [];
                                pendingDirectory = null;
                            }
                        }
                    }
                    break;
            }
        }
    }

    return {
        hasPest: true,
        expectations,
        testCaseExtensions,
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

    const autoGeneratedNotice = `/**
* This file is auto-generated by the Laravel VS Code extension.
* Do not modify this file directly as your changes will be overwritten.
*/\n\n`;

    const pestFunctionsContent =
        config.testCaseExtensions.length > 0
            ? `namespace {\n${generatePestFunctionsContent(config.testCaseExtensions.map((ext) => ext.testCase))}\n}`
            : "";

    const finalContent = `<?php\n\n${autoGeneratedNotice}${pestFunctionsContent}\n\n${content}\n`;

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

        const pestConfig = await parsePestConfig(detected);
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
