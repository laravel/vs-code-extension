import { openFile } from "@src/commands";
import { notFound } from "@src/diagnostic";
import { HoverProvider, LinkProvider } from "@src/index";
import { getInertiaViews } from "@src/repositories/inertia";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@src/support/doc";
import { inertiaMatchRegex } from "@src/support/patterns";
import { projectPath, relativePath } from "@src/support/project";
import * as vscode from "vscode";

export const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, inertiaMatchRegex, (match) => {
        return getInertiaViews().items[match[0]]?.uri ?? null;
    });
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, inertiaMatchRegex, (match) => {
        const item = getInertiaViews().items[match];

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

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, inertiaMatchRegex, (match, range) => {
        return getInertiaViews().whenLoaded((items) => {
            const view = items[match[0]];

            if (view) {
                return null;
            }

            return notFound("Inertia view", match[0], range, "inertia");
        });
    });
};

export const codeActionProvider = async (
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

    const fileUri = vscode.Uri.file(
        projectPath(`resources/js/Pages/${missingFilename}.vue`),
    );

    const action = new vscode.CodeAction(
        "Create missing Inertia view",
        vscode.CodeActionKind.QuickFix,
    );
    action.edit = getEdit(fileUri);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.command = openFile(fileUri, 1, 0);

    return [action];
};

const getEdit = (uri: vscode.Uri): vscode.WorkspaceEdit => {
    const edit = new vscode.WorkspaceEdit();

    edit.createFile(uri, {
        overwrite: false,
        contents: Buffer.from(
            ["<script setup>", "</script>", "<template>", "</template>"].join(
                "\n\n",
            ),
        ),
    });

    return edit;
};
