import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import {
    CodeActionProviderFunction,
    HoverProvider,
    LinkProvider,
} from "@src/index";
import { getInertiaViews } from "@src/repositories/inertia";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { projectPath, relativePath } from "@src/support/project";
import { facade } from "@src/support/util";
import * as vscode from "vscode";

const toFind = [
    {
        class: facade("Route"),
        method: "inertia",
    },
    {
        class: "Inertia\\Inertia",
        method: ["render", "modal"],
    },
    {
        class: null,
        method: "inertia",
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
