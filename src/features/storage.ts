import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getConfigs } from "@src/repositories/configs";
import { getPaths } from "@src/repositories/paths";
import { config } from "@src/support/config";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { CompletionProvider, FeatureTag, LinkProvider } from "..";

const toFind: FeatureTag = {
    class: facade("Storage"),
    method: ["disk", "fake", "persistentFake", "forgetDisk"],
    argumentIndex: 0,
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getPaths,
        ({ param, item }) => {
            const configItem = getConfigs().items.configs.find(
                (c) => c.name === `filesystems.disks.${param.value}`,
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

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getConfigs,
        ({ param, item, index }) => {
            const config = getConfigs().items.configs.find(
                (c) => c.name === `filesystems.disks.${param.value}`,
            );

            if (config) {
                return null;
            }

            return notFound(
                "Storage Disk",
                param.value,
                detectedRange(param),
                "storage_disk",
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
        if (!config("storage.completion", true)) {
            return [];
        }

        return getConfigs()
            .items.configs.filter((config) => {
                return (
                    config.name.startsWith("filesystems.disks.") &&
                    config.name.split(".").length === 3
                );
            })
            .map((config) => {
                const completeItem = new vscode.CompletionItem(
                    config.name.replace("filesystems.disks.", ""),
                    vscode.CompletionItemKind.Value,
                );

                completeItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completeItem;
            });
    },
};
