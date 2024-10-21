import { projectPath } from "@/support/project";
import * as vscode from "vscode";

export class Inertia implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.CodeAction[] {
        return context.diagnostics
            .filter((diagnostic) => diagnostic.code === "inertia")
            .map((diagnostic) => this.createCommandCodeAction(diagnostic));
    }

    private createCommandCodeAction(
        diagnostic: vscode.Diagnostic,
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            "Create missing Inertia view",
            vscode.CodeActionKind.QuickFix,
        );

        const editor = vscode.window.activeTextEditor;

        let missingFilename = "";

        if (editor) {
            missingFilename = editor.document.getText(diagnostic.range);
        }

        if (!missingFilename) {
            return action;
        }

        const edit = new vscode.WorkspaceEdit();

        edit.createFile(
            vscode.Uri.file(
                projectPath(`resources/js/Pages/${missingFilename}.vue`),
            ),
            {
                overwrite: false,
                contents: Buffer.from(
                    [
                        "<script setup>",
                        "</script>",
                        "<template>",
                        "</template>",
                    ].join("\n\n"),
                ),
            },
        );

        action.edit = edit;
        action.command = {
            command: "laravel.open",
            title: "Open file",
            arguments: [
                vscode.Uri.file(
                    projectPath(`resources/js/Pages/${missingFilename}.vue`),
                ),
                1,
                0,
            ],
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        return action;
    }
}
