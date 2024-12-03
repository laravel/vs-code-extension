import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import {
    CodeActionProviderFunction,
    DetectResult,
    HoverProvider,
    LinkProvider,
} from "@src/index";
import { getViews } from "@src/repositories/views";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { projectPath, relativePath } from "@src/support/project";
import { facade } from "@src/support/util";
import * as vscode from "vscode";

const toFind = [
    { class: facade("View"), method: "make" },
    { class: facade("Route"), method: "view" },
    { class: null, method: ["view", "markdown", "assertViewIs"] },
    // "@include",
    // "@extends",
    // "@component",
];

const isCorrectIndexForMethod = (item: DetectResult, index: number) => {
    if (item.class === facade("Route")) {
        return index === 1;
    }

    return true;
};

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getViews,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const uri = getViews().items[param.value]?.uri;

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
    return findHoverMatchesInDoc(doc, pos, toFind, getViews, (match) => {
        const item = getViews().items[match];

        if (!item) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                `[${relativePath(item.uri.path)}](${item.uri.fsPath})`,
            ),
        );
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getViews,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const view = getViews().items[param.value];

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

export { diagnosticProvider, hoverProvider, linkProvider };
