import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import { getEnv } from "@src/repositories/env";
import { getEnvExample } from "@src/repositories/env-example";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@src/support/doc";
import { envMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { CodeActionProviderFunction, HoverProvider, LinkProvider } from "..";

export const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, envMatchRegex, (match) => {
        const env = getEnv().items[match[0]] ?? null;

        if (!env) {
            return null;
        }

        return vscode.Uri.file(projectPath(".env")).with({
            fragment: `L${env.lineNumber}`,
        });
    });
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, envMatchRegex, (match) => {
        const item = getEnv().items[match];

        if (!item || item.value === "") {
            return null;
        }

        return new vscode.Hover(new vscode.MarkdownString(`\`${item.value}\``));
    });
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, envMatchRegex, (match, range) => {
        return getEnv().whenLoaded((items) => {
            const env = items[match[0]];

            if (env) {
                return null;
            }

            return notFound("Env", match[0], range, "env");
        });
    });
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
