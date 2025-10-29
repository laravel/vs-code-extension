import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import {
    CodeActionProviderFunction,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "@src/index";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import {
    getLivewireViewItems,
    getViewItemByKey,
    getViews,
    ViewItem,
} from "@src/repositories/views";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { contract, facade } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import fs from "fs";
import * as vscode from "vscode";

const toFind: FeatureTag = [
    {
        class: contract("Routing\\ResponseFactory"),
        method: "view",
        argumentIndex: 0,
    },
    {
        class: contract("View\\Factory"),
        method: "make",
        argumentIndex: 0,
    },
    {
        class: facade("View"),
        method: [
            "make",
            "first",
            "renderWhen",
            "renderUnless",
            "renderEach",
            "exists",
        ],
        argumentIndex: 0,
    },
    {
        class: facade("Route"),
        method: ["view", "livewire"],
        argumentIndex: 1,
    },
    {
        class: "Illuminate\\Notifications\\Messages\\MailMessage",
        method: ["markdown", "view"],
        argumentIndex: 0,
    },
    {
        class: "Illuminate\\Mail\\Mailables\\Content",
        argumentName: ["view", "markdown"],
    },
    {
        method: [
            // "@component",
            "@each",
            "@extends",
            "@include",
            "@push",
            "@section",
            "assertViewIs",
            "links",
            "markdown",
            "view",
        ],
        argumentIndex: 0,
    },
];

const isLivewireMethod = (item: AutocompleteParsingResult.ContextValue) => {
    return (
        // @ts-ignore
        item.className === "Illuminate\\Support\\Facades\\Route" &&
        // @ts-ignore
        item.methodName === "livewire"
    );
};

const isCorrectIndexForMethod = (
    item: AutocompleteParsingResult.ContextValue,
    index: number,
    param: AutocompleteParsingResult.StringValue,
) => {
    // @ts-ignore
    if (facade("Route").includes(item.className)) {
        return index === 1;
    }

    // @ts-ignore
    if (item.className === "Illuminate\\Mail\\Mailables\\Content") {
        // TODO: Re-instate this
        // if (param.name) {
        //     return ["view", "markdown"].includes(param.name);
        // }

        return [0, 3].includes(index);
    }

    return true;
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getViews,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index, param)) {
                return null;
            }

            const path = getViewItemByKey(
                param.value,
                isLivewireMethod(item),
            )?.path;

            if (!path) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(projectPath(path)),
            );
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getViews, (match, arg) => {
        const view = getViewItemByKey(match, isLivewireMethod(arg.item));

        if (!view) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                `[${view.path}](${vscode.Uri.file(projectPath(view.path))})`,
            ),
        );
    });
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getViews,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index, param)) {
                return null;
            }

            // @ts-ignore
            if (["@section", "@push"].includes(item.methodName)) {
                return null;
            }

            const view = getViewItemByKey(param.value, isLivewireMethod(item));

            if (view) {
                return null;
            }

            return notFound("View", param.value, detectedRange(param), "view");
        },
    );
};

export const codeActionProvider: CodeActionProviderFunction = async (
    diagnostic: vscode.Diagnostic,
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    token: vscode.CancellationToken,
): Promise<vscode.CodeAction[]> => {
    if (diagnostic.code !== "view") {
        return [];
    }

    const missingFilename = document.getText(diagnostic.range);

    if (!missingFilename) {
        return [];
    }

    const fileUri = vscode.Uri.file(
        projectPath(
            `resources/views/${missingFilename.replace(/\./g, "/")}.blade.php`,
        ),
    );

    const edit = new vscode.WorkspaceEdit();

    edit.createFile(fileUri, {
        overwrite: false,
        contents: Buffer.from(""),
    });

    const action = new vscode.CodeAction(
        "Create missing view",
        vscode.CodeActionKind.QuickFix,
    );
    action.edit = edit;
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.command = openFile(fileUri, 1, 0);

    return [action];
};

const getCompletionItem = (
    view: ViewItem,
    document: vscode.TextDocument,
    position: vscode.Position,
) => {
    let completionItem = new vscode.CompletionItem(
        view.key,
        vscode.CompletionItemKind.Constant,
    );

    completionItem.sortText = (view.isVendor ? "1" : "0") + view.key;

    completionItem.range = document.getWordRangeAtPosition(
        position,
        wordMatchRegex,
    );

    return completionItem;
};

export const completionProvider = {
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
        if (!config("view.completion", true)) {
            return [];
        }

        const views = getViews().items;

        if (result.func() && ["@section", "@push"].includes(result.func()!)) {
            return this.getYields(result.func()!, document.getText());
        }

        if (result.class() === "Illuminate\\Mail\\Mailables\\Content") {
            if (
                (result.argumentName() &&
                    ["view", "markdown"].includes(result.argumentName())) ||
                result.isParamIndex(0) ||
                result.isParamIndex(3)
            ) {
                return views.map((view) =>
                    getCompletionItem(view, document, position),
                );
            }

            return [];
        }

        if (result.isFacade("Route")) {
            if (result.func() === "livewire" && result.isParamIndex(1)) {
                return getLivewireViewItems().map((view) =>
                    getCompletionItem(view, document, position),
                );
            }

            if (result.func() === "view" && result.isParamIndex(1)) {
                return views.map((view) =>
                    getCompletionItem(view, document, position),
                );
            }

            return [];
        }

        if (["renderWhen", "renderUnless"].find((f) => f === result.func())) {
            if (!result.isParamIndex(1)) {
                return [];
            }

            return views.map((view) =>
                getCompletionItem(view, document, position),
            );
        }

        if (result.isParamIndex(0)) {
            return views.map((view) =>
                getCompletionItem(view, document, position),
            );
        }

        // TODO: Layer this back in (props)
        return [];

        // if (
        //     // @ts-ignore
        //     typeof views[result.param(0).value] === "undefined" ||
        //     !result.fillingInArrayKey()
        // ) {
        //     return [];
        // }

        // let viewContent = fs.readFileSync(
        //     // @ts-ignore
        //     views[result.param(0).value].uri.path,
        //     "utf8",
        // );

        // let variableRegex = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
        // let r: RegExpExecArray | null = null;
        // let variableNames = new Set<string>([]);

        // while ((r = variableRegex.exec(viewContent))) {
        //     variableNames.add(r[1]);
        // }

        // return [...variableNames].map((variableName) => {
        //     let variablecompletionItem = new vscode.CompletionItem(
        //         variableName,
        //         vscode.CompletionItemKind.Constant,
        //     );
        //     variablecompletionItem.range = document.getWordRangeAtPosition(
        //         position,
        //         wordMatchRegex,
        //     );
        //     return variablecompletionItem;
        // });
    },

    getYields(func: string, documentText: string): vscode.CompletionItem[] {
        let extendsRegex = /@extends\s*\([\'\"](.+)[\'\"]\)/g;
        let regexResult = extendsRegex.exec(documentText);
        const views = getViews().items;

        if (!regexResult) {
            return [];
        }

        const item = views.find((v) => v.key === regexResult![1]);

        if (typeof item === "undefined") {
            return [];
        }

        let parentContent = fs.readFileSync(projectPath(item.path), "utf8");
        let yieldRegex =
            func === "@push"
                ? /@stack\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g
                : /@yield\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g;

        let yieldNames = new Set<string>([]);

        while ((regexResult = yieldRegex.exec(parentContent))) {
            yieldNames.add(regexResult[1]);
        }

        return [...yieldNames]
            .map(
                (yieldName) =>
                    new vscode.CompletionItem(
                        yieldName,
                        vscode.CompletionItemKind.Constant,
                    ),
            )
            .concat(this.getYields(func, parentContent));
    },
};
