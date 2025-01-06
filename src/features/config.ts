import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getConfigs } from "@src/repositories/configs";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { facade } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import * as vscode from "vscode";
import {
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind: FeatureTag = [
    { method: "config" },
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

            const configItem = getConfigs().items.find(
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

            const configItem = getConfigs().items.find(
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

            const config = getConfigs().items.find(
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

        return getConfigs().items.map((config) => {
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
