import { codeActionProvider as envProvider } from "@src/features/env";
import { codeActionProvider as inertiaProvider } from "@src/features/inertia";
import * as vscode from "vscode";
import { CodeActionProviderFunction } from "..";

const providers: CodeActionProviderFunction[] = [envProvider, inertiaProvider];

export class CodeActionProvider implements vscode.CodeActionProvider {
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
                .map((diagnostic) =>
                    providers.map((provider) =>
                        provider(diagnostic, document, range, token),
                    ),
                )
                .flat(),
        ).then((actions) => actions.flat());
    }
}
