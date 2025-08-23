import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getEnv } from "@src/repositories/env";
import { getEnvExample } from "@src/repositories/env-example";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { support } from "@src/support/util";
import * as vscode from "vscode";
import {
    CodeActionProviderFunction,
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind: FeatureTag = [
    {
        class: support("Env"),
        method: ["get"],
        argumentIndex: 0,
    },
    {
        method: ["env"],
        argumentIndex: 0,
    },
];

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getEnv,
        ({ param, index }) => {
            if (index > 0) {
                return null;
            }

            const env = getEnv().items[param.value];

            if (!env) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(projectPath(".env")).with({
                    fragment: `L${env.lineNumber}`,
                }),
            );
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getEnv, (match) => {
        const item = getEnv().items[match];

        if (!item) {
            return null;
        }

        const display = item.value === "" ? "[empty string]" : item.value;

        return new vscode.Hover(new vscode.MarkdownString(`\`${display}\``));
    });
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getEnv,
        ({ param, index }) => {
            if (index > 0) {
                return null;
            }

            const env = getEnv().items[param.value];

            if (env) {
                return null;
            }

            return notFound("Env", param.value, detectedRange(param), {
                value: "env",
                target: vscode.Uri.file(projectPath(".env")),
            });
        },
    );
};

export const viteEnvCodeActionProvider: vscode.CodeActionProvider = {
    async provideCodeActions(document, range, context, token) {
        if (
            !config("env.viteQuickFix", true) ||
            !document.uri.path.includes(".env")
        ) {
            return [];
        }

        let envVariables = [];
        let start = range.start.line;
        const vitePrefix = "VITE_";

        while (start <= range.end.line) {
            const envVariable = document
                .lineAt(start)
                .text.split("=")[0]
                .trim();

            if (
                envVariable !== "" &&
                !envVariable.startsWith("#") &&
                !envVariable.startsWith(vitePrefix)
            ) {
                envVariables.push(envVariable);
            }
            start++;
        }

        if (envVariables.length === 0) {
            return [];
        }

        const envContents = document.getText();
        const lines = envContents.toString().split("\n");

        envVariables = envVariables.filter(
            (envVariable) =>
                !lines.find((line) =>
                    line.startsWith(vitePrefix + envVariable + "="),
                ),
        );

        if (envVariables.length === 0) {
            return [];
        }

        // Default to the end of the file
        let lineNumber = lines.length;
        let foundGroup = false;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(vitePrefix)) {
                lineNumber = i + 1;
                foundGroup = true;
            }
        }

        const finalValue = envVariables
            .map(
                (envVariable) =>
                    `${vitePrefix}${envVariable}="\${${envVariable}}"`,
            )
            .join("\n");

        const edit = new vscode.WorkspaceEdit();

        const newLine = (() => {
            if (lineNumber === lines.length) {
                return true;
            }

            return !foundGroup;
        })();

        edit.insert(
            document.uri,
            new vscode.Position(lineNumber, 0),
            `${newLine ? "\n" : ""}${finalValue}`,
        );

        const action = new vscode.CodeAction(
            envVariables.length === 1
                ? `Create Vite env variable from "${envVariables[0]}"`
                : `Create Vite env variables from selection`,
            vscode.CodeActionKind.QuickFix,
        );

        action.edit = edit;
        action.command = openFile(document.uri, lineNumber, finalValue.length);

        return [action];
    },
};

export const codeActionProvider: CodeActionProviderFunction = async (
    diagnostic: vscode.Diagnostic,
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    token: vscode.CancellationToken,
): Promise<vscode.CodeAction[]> => {
    if (diagnostic.code !== "env") {
        return [];
    }

    const missingVar = document.getText(diagnostic.range);

    if (!missingVar) {
        return [];
    }

    const actions = await Promise.all([
        addToEnv(diagnostic, missingVar),
        addFromEnvExample(diagnostic, missingVar),
    ]);

    return actions.filter((action) => action !== null);
};

const getCodeAction = async (
    title: string,
    missingVar: string,
    diagnostic: vscode.Diagnostic,
    value?: string,
) => {
    const edit = new vscode.WorkspaceEdit();

    const envContents = await vscode.workspace.fs.readFile(
        vscode.Uri.file(projectPath(".env")),
    );

    const lines = envContents.toString().split("\n");

    const varPrefix = missingVar.split("_")[0] + "_";
    // Default to the end of the file
    let lineNumber = lines.length;
    let foundGroup = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(varPrefix)) {
            lineNumber = i + 1;
            foundGroup = true;
        }
    }

    const finalValue = `${missingVar}=${value ?? ""}\n`;

    edit.insert(
        vscode.Uri.file(projectPath(".env")),
        new vscode.Position(lineNumber, 0),
        `${foundGroup ? "" : "\n"}${finalValue}`,
    );

    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);

    action.edit = edit;
    action.command = openFile(
        projectPath(".env"),
        lineNumber,
        finalValue.length,
    );
    action.diagnostics = [diagnostic];
    action.isPreferred = value === undefined;

    return action;
};

const addToEnv = async (
    diagnostic: vscode.Diagnostic,
    missingVar: string,
): Promise<vscode.CodeAction | null> => {
    return getCodeAction("Add variable to .env", missingVar, diagnostic);
};

const addFromEnvExample = async (
    diagnostic: vscode.Diagnostic,
    missingVar: string,
): Promise<vscode.CodeAction | null> => {
    const example = await getEnvExample().items;

    if (!example[missingVar]) {
        return null;
    }

    return getCodeAction(
        "Add value from .env.example",
        missingVar,
        diagnostic,
        example[missingVar].value,
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
        if (!config("env.completion", true)) {
            return [];
        }

        return Object.entries(getEnv().items).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Constant,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            completeItem.detail = value.value;

            return completeItem;
        });
    },
};
