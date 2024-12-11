import { notFound } from "@src/diagnostic";
import { getConfigs } from "@src/repositories/configs";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { relativePath } from "@src/support/project";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { DetectResult, HoverProvider, LinkProvider } from "..";

const toFind = [
    { class: null, method: "config" },
    {
        class: [facade("Config"), "config"],
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
    },
];

const isCorrectIndexForMethod = (item: DetectResult, index: number) => {
    if (["prepend", "push"].includes(item.method)) {
        return index === 0;
    }

    return true;
};

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getConfigs,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const uri = getConfigs().items.find(
                (config) => config.name === param.value,
            )?.uri;

            if (!uri) {
                return null;
            }

            return new vscode.DocumentLink(detectedRange(param), uri);
        },
    );
};

const hoverProvider: HoverProvider = (
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

            if (configItem.uri) {
                text.push(
                    `[${relativePath(configItem.uri.path)}](${
                        configItem.uri.fsPath
                    })`,
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

const diagnosticProvider = (
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

export { diagnosticProvider, hoverProvider, linkProvider };
