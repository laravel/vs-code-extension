import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import {
    ARRAY_VALUE,
    getConfigByName,
    getConfigs,
    getNestedConfigByName,
    getPreviousConfigByName,
} from "@src/repositories/configs";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { getIndentNumber } from "@src/support/indent";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import {
    contract,
    facade,
    generateNestedKeysStructure,
    indent,
    withLineFragment,
} from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import os from "os";
import * as vscode from "vscode";
import {
    CodeActionProviderFunction,
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind: FeatureTag = [
    { method: "config", argumentIndex: 0 },
    {
        class: [contract("Config\\Repository")],
        method: ["get", "prepend", "push"],
        argumentIndex: 0,
    },
    {
        class: [...facade("Config"), "config"],
        method: [
            "get",
            "getMany",
            "string",
            "integer",
            "boolean",
            "float",
            "array",
            "prepend",
            "push",
        ],
        argumentIndex: 0,
    },
];

const isCorrectIndexForMethod = (
    item: AutocompleteParsingResult.ContextValue,
    index: number,
) => {
    if (
        [
            "get",
            "getMany",
            "string",
            "integer",
            "boolean",
            "float",
            "array",
            "prepend",
            "push",
            "config",
            // @ts-ignore
        ].includes(item.methodName ?? "")
    ) {
        return index === 0;
    }

    return true;
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getConfigs,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const configItem = getConfigs().items.configs.find(
                (config) => config.name === param.value,
            );

            if (!configItem || !configItem.file) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(projectPath(configItem.file)).with({
                    fragment: `L${configItem.line}`,
                }),
            );
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(
        doc,
        pos,
        toFind,
        getConfigs,
        (match, { index, item }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const configItem = getConfigs().items.configs.find(
                (config) => config.name === match,
            );

            if (!configItem) {
                return null;
            }

            const text = [];

            if (configItem.value !== null) {
                const display =
                    configItem.value === ""
                        ? "[empty string]"
                        : configItem.value;

                text.push("`" + display + "`");
            }

            if (configItem.file) {
                text.push(
                    `[${configItem.file}](${vscode.Uri.file(
                        projectPath(configItem.file),
                    ).with({
                        fragment: `L${configItem.line}`,
                    })})`,
                );
            }

            if (text.length === 0) {
                return null;
            }

            return new vscode.Hover(
                new vscode.MarkdownString(text.join("\n\n")),
            );
        },
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getConfigs,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const config = getConfigs().items.configs.find(
                (c) => c.name === param.value,
            );

            if (config) {
                return null;
            }

            return notFound(
                "Config",
                param.value,
                detectedRange(param),
                "config",
            );
        },
    );
};

export const codeActionProvider: CodeActionProviderFunction = async (
    diagnostic: vscode.Diagnostic,
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    token: vscode.CancellationToken,
): Promise<vscode.CodeAction[]> => {
    if (diagnostic.code !== "config") {
        return [];
    }

    const missingVar = document.getText(diagnostic.range);

    if (!missingVar) {
        return [];
    }

    const actions = await Promise.all([addToFile(diagnostic, missingVar)]);

    return actions.filter((action) => action !== null);
};

const addToFile = async (
    diagnostic: vscode.Diagnostic,
    missingVar: string,
): Promise<vscode.CodeAction | null> => {
    const edit = new vscode.WorkspaceEdit();

    const config = getConfigByName(missingVar);

    if (config) {
        return null;
    }

    const nestedConfig = getNestedConfigByName(missingVar);

    if (!nestedConfig) {
        return null;
    }

    if (!nestedConfig.file) {
        return null;
    }

    // Case when user tries to add a key to a existing key that is not an array
    if (nestedConfig.value !== ARRAY_VALUE) {
        return null;
    }

    const path = projectPath(nestedConfig.file);

    const fileName = path.split("/").pop()?.replace(".php", "");

    if (!fileName) {
        return null;
    }

    // Remember that Laravel config keys can go to subfolders, for example: foo.bar.baz.example
    // can be: foo/bar.php with a key "baz.example" but also foo/bar/baz.php with a key "example"
    const startIndentNumber = nestedConfig.name
        .substring(missingVar.indexOf(`${fileName}.`))
        .split(".").length;

    const nestedKeys = missingVar
        .slice(nestedConfig.name.length + 1)
        .split(".");

    const configContents = await vscode.workspace.fs.readFile(
        vscode.Uri.file(path),
    );

    const lineNumberFromConfig = nestedConfig.line
        ? Number(nestedConfig.line)
        : undefined;

    const lineNumber =
        lineNumberFromConfig ??
        configContents
            .toString()
            .split("\n")
            .findIndex((line) => line.startsWith("];"));

    if (lineNumber === -1) {
        return null;
    }

    const nestedKeyStructure = generateNestedKeysStructure(
        nestedKeys,
        startIndentNumber,
    );

    edit.insert(
        vscode.Uri.file(path),
        new vscode.Position(lineNumber, 0),
        nestedKeyStructure.join(os.EOL) + os.EOL,
    );

    const action = new vscode.CodeAction(
        "Add config to the file",
        vscode.CodeActionKind.QuickFix,
    );

    action.edit = edit;
    action.command = openFile(
        path,
        lineNumber + nestedKeys.length - 1,
        nestedKeyStructure[nestedKeys.length - 1].length - 2,
    );
    action.diagnostics = [diagnostic];

    return action;
};

export const completionProvider: CompletionProvider = {
    tags() {
        return toFind;
    },

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (!config("config.completion", true)) {
            return [];
        }

        if (result.func() === "getMany" && !result.currentParamIsArray()) {
            return [];
        }

        return getConfigs().items.configs.map((config) => {
            let completeItem = new vscode.CompletionItem(
                config.name,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            if (config.value) {
                completeItem.detail = config.value.toString();
            }

            return completeItem;
        });
    },
};
