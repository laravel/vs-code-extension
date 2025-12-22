import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getConfigPathByName, getConfigs } from "@src/repositories/configs";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { getIndentNumber } from "@src/support/indent";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { contract, facade, withLineFragment } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
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
    return getCodeAction(
        "Add variable to the configuration file",
        missingVar,
        diagnostic,
    );
};

const getCodeAction = async (
    title: string,
    missingVar: string,
    diagnostic: vscode.Diagnostic,
    value?: string,
) => {
    const edit = new vscode.WorkspaceEdit();

    const config = getConfigs().items.configs.find(
        (c) => c.name === missingVar,
    );

    if (config) {
        return null;
    }

    const configPath = getConfigPathByName(missingVar);

    if (!configPath) {
        return null;
    }

    const fileName = configPath.path.split("/").pop()?.replace(".php", "");

    if (!fileName) {
        return null;
    }

    // Remember that Laravel config keys can go to subfolders, for example: foo.bar.baz.example
    // can be: foo/bar.php with a key "baz.example" but also foo/bar/baz.php with a key "example"
    const nestedKeys =
        missingVar.substring(missingVar.indexOf(`${fileName}.`)).split(".")
            .length - 1;

    // Case when a user tries to add a new config key to an existing key that is not an array
    if (!configPath.line && nestedKeys > 1) {
        return null;
    }

    const configContents = await vscode.workspace.fs.readFile(
        vscode.Uri.file(configPath.path),
    );

    let lineNumber = configPath.line ? Number(configPath.line) - 1 : undefined;

    if (!lineNumber) {
        // Default to the end of the file
        const lines = configContents.toString().split("\n");

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("];")) {
                lineNumber = i;
            }
        }
    }

    if (!lineNumber) {
        return null;
    }

    const key = missingVar.split(".").pop();

    const indent = " ".repeat((getIndentNumber("php") ?? 4) * nestedKeys);

    const finalValue = `${indent}'${key}' => '',\n`;

    edit.insert(
        vscode.Uri.file(configPath.path),
        new vscode.Position(lineNumber, 0),
        finalValue,
    );

    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);

    action.edit = edit;
    action.command = openFile(
        configPath.path,
        lineNumber,
        finalValue.length - 3,
    );
    action.diagnostics = [diagnostic];
    action.isPreferred = value === undefined;

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
