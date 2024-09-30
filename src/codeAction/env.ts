import * as vscode from "vscode";
import { getEnvExample } from "../repositories/env-example";
import { projectPath } from "../support/project";

export const openFileCommand = (
    uri: vscode.Uri,
    lineNumber: number,
    position: number,
) => {
    vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(
            new vscode.Position(lineNumber, position),
            new vscode.Position(lineNumber, position),
        ),
    });
};

export class Env implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        return Promise.all(
            context.diagnostics
                .filter((diagnostic) => diagnostic.code === "env")
                .map((diagnostic) => this.createCommandCodeAction(diagnostic)),
        ).then((actions) => actions.flat());
    }

    private async createCommandCodeAction(
        diagnostic: vscode.Diagnostic,
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        const editor = vscode.window.activeTextEditor;

        let missingVar = "";

        if (editor) {
            missingVar = editor.document.getText(diagnostic.range);
        }

        if (!missingVar) {
            return actions;
        }

        const envAction = await this.addToEnv(diagnostic, missingVar);

        if (envAction) {
            actions.push(envAction);
        }

        const envExampleAction = await this.addToEnvExample(
            diagnostic,
            missingVar,
        );

        if (envExampleAction) {
            actions.push(envExampleAction);
        }

        return actions;
    }

    protected async addToEnv(
        diagnostic: vscode.Diagnostic,
        missingVar: string,
    ): Promise<vscode.CodeAction | null> {
        const action = new vscode.CodeAction(
            "Add variable to .env",
            vscode.CodeActionKind.QuickFix,
        );

        const edit = new vscode.WorkspaceEdit();

        const envContents = await vscode.workspace.fs.readFile(
            vscode.Uri.file(projectPath(".env")),
        );

        const lines = envContents.toString().split("\n");

        const varPrefix = missingVar.split("_")[0] + "_";

        const index = lines
            .slice()
            .reverse()
            .findIndex((line) => line.startsWith(varPrefix));

        const originalIndex = index !== -1 ? lines.length - 1 - index : -1;

        const line =
            originalIndex !== -1 ? originalIndex + 1 : lines.length - 1;

        edit.insert(
            vscode.Uri.file(projectPath(".env")),
            new vscode.Position(line, 0),
            `${missingVar}=\n`,
        );

        action.edit = edit;
        action.command = {
            command: "laravel.open",
            title: "Open file",
            arguments: [
                vscode.Uri.file(projectPath(".env")),
                line,
                missingVar.length + 1,
            ],
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        return action;
    }

    protected async addToEnvExample(
        diagnostic: vscode.Diagnostic,
        missingVar: string,
    ): Promise<vscode.CodeAction | null> {
        const example = await getEnvExample().items;

        if (!example[missingVar]) {
            return null;
        }

        const action = new vscode.CodeAction(
            "Add value from .env.example",
            vscode.CodeActionKind.QuickFix,
        );

        const edit = new vscode.WorkspaceEdit();

        const envContents = await vscode.workspace.fs.readFile(
            vscode.Uri.file(projectPath(".env.example")),
        );

        const lines = envContents.toString().split("\n");

        const varPrefix = missingVar.split("_")[0] + "_";

        const index = lines
            .slice()
            .reverse()
            .findIndex((line) => line.startsWith(varPrefix));

        const originalIndex = index !== -1 ? lines.length - 1 - index : -1;

        const line =
            originalIndex !== -1 ? originalIndex + 1 : lines.length - 1;

        edit.insert(
            vscode.Uri.file(projectPath(".env")),
            new vscode.Position(line, 0),
            `${missingVar}=${example[missingVar].value}\n`,
        );

        action.edit = edit;
        action.command = {
            command: "laravel.open",
            title: "Open file",
            arguments: [
                vscode.Uri.file(projectPath(".env")),
                line - 2,
                `${missingVar}=${example[missingVar].value}`.length,
            ],
        };

        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        return action;
    }
}
