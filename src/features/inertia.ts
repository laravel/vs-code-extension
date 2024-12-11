import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import {
    CodeActionProviderFunction,
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "@src/index";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getInertiaViews } from "@src/repositories/inertia";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath, relativePath } from "@src/support/project";
import { facade } from "@src/support/util";
import fs from "fs";
import * as vscode from "vscode";

const toFind: FeatureTag = [
    {
        class: "Inertia\\Inertia",
        method: ["render", "modal"],
        argumentIndex: [0, 1],
    },
    {
        class: facade("Route"),
        method: ["inertia"],
        argumentIndex: [1, 2],
    },
    {
        method: ["inertia"],
        argumentIndex: [0, 1],
    },
];

const isCorrectMethodIndex = (item: any, index: number) => {
    if (item.class === facade("Route") && item.method === "inertia") {
        return index === 1;
    }

    return index === 0;
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getInertiaViews,
        ({ param, item, index }) => {
            if (!isCorrectMethodIndex(item, index)) {
                return null;
            }

            const view = getInertiaViews().items[param.value];

            if (!view) {
                return null;
            }

            return new vscode.DocumentLink(detectedRange(param), view.uri);
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
        getInertiaViews,
        (match, { item, index }) => {
            if (!isCorrectMethodIndex(item, index)) {
                return null;
            }

            const found = getInertiaViews().items[match];

            if (!found) {
                return null;
            }

            return new vscode.Hover(
                new vscode.MarkdownString(
                    `[${relativePath(found.uri.path)}](${found.uri.fsPath})`,
                ),
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
        getInertiaViews,
        ({ param, item, index }) => {
            if (!isCorrectMethodIndex(item, index)) {
                return null;
            }

            const view = getInertiaViews().items[param.value];

            if (view) {
                return null;
            }

            return notFound(
                "Inertia view",
                param.value,
                detectedRange(param),
                "inertia",
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
    if (diagnostic.code !== "inertia") {
        return [];
    }

    const missingFilename = document.getText(diagnostic.range);

    if (!missingFilename) {
        return [];
    }

    const items = getInertiaViews().items;
    let extension = "vue";

    for (const item in items) {
        extension = items[item].uri.path.split(".").pop() ?? "vue";
        break;
    }

    const fileUri = vscode.Uri.file(
        projectPath(`resources/js/Pages/${missingFilename}.${extension}`),
    );

    const edit = new vscode.WorkspaceEdit();

    const mapping: Record<string, string> = {
        vue: ["<script setup>", "</script>", "<template>", "</template>"].join(
            "\n\n",
        ),
    };

    edit.createFile(fileUri, {
        overwrite: false,
        contents: Buffer.from(mapping[extension] ?? ""),
    });

    const action = new vscode.CodeAction(
        "Create missing Inertia view",
        vscode.CodeActionKind.QuickFix,
    );
    action.edit = edit;
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.command = openFile(fileUri, 1, 0);

    return [action];
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
        const views = getInertiaViews().items;

        if (result.class() === facade("Route")) {
            if (result.isParamIndex(1)) {
                return Object.entries(views).map(([key]) => {
                    let completionItem = new vscode.CompletionItem(
                        key,
                        vscode.CompletionItemKind.Constant,
                    );

                    completionItem.range = document.getWordRangeAtPosition(
                        position,
                        wordMatchRegex,
                    );

                    return completionItem;
                });
            }

            return [];
        }

        if (result.isParamIndex(0)) {
            return Object.entries(views).map(([key]) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Constant,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
        }

        if (
            // @ts-ignore
            typeof views[result.param(0).value] === "undefined" ||
            !result.fillingInArrayKey()
        ) {
            return [];
        }

        let viewContent = fs.readFileSync(
            // @ts-ignore
            views[result.param(0).value].uri.path,
            "utf8",
        );
        return (
            // @ts-ignore
            this.getPropAutoComplete(viewContent)
                .filter(
                    // @ts-ignore
                    (variableName) =>
                        !result.currentParamArrayKeys().includes(variableName),
                )
                // @ts-ignore
                .map((variableName) => {
                    let variablecompletionItem = new vscode.CompletionItem(
                        variableName,
                        vscode.CompletionItemKind.Constant,
                    );
                    variablecompletionItem.range =
                        document.getWordRangeAtPosition(
                            position,
                            wordMatchRegex,
                        );
                    return variablecompletionItem;
                })
        );
    },

    // @ts-ignore
    getPropAutoComplete(viewContent: string): string[] {
        let variableNames = new Set<string>([]);

        const regexes = [
            {
                regex: /defineProps<({[^}>]+})>/s,
                getPropsString: (match: RegExpMatchArray) =>
                    match[0]
                        .replace("defineProps<", "")
                        .replace(">", "")
                        .replace(/\?\:/g, ":")
                        // Remove all whitespace
                        .replace(/\s/g, ""),
            },
            {
                regex: /defineProps\(({[^})]+})\)/s,
                getPropsString: (match: RegExpMatchArray) =>
                    match[0]
                        .replace("defineProps(", "")
                        .replace(")", "")
                        .replace(/\?\:/g, ":")
                        // Remove all whitespace
                        .replace(/\s/g, ""),
            },
        ];

        for (let { regex, getPropsString } of regexes) {
            let match = viewContent.match(regex);

            if (!match) {
                continue;
            }

            let props = getPropsString(match);

            // Chop off the starting and ending curly braces
            props = props.substring(1, props.length - 1);

            let nestedLevel = 0;

            props.split(";").forEach((prop) => {
                if (prop.includes("{")) {
                    nestedLevel++;
                }

                if (prop.includes("}")) {
                    nestedLevel--;
                }

                if (nestedLevel > 0 || !prop.includes(":")) {
                    return;
                }

                let [key] = prop.split(":");

                variableNames.add(key);
            });

            return [...variableNames];
        }

        return [];
    },
};
