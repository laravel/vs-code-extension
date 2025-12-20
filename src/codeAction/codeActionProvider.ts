import { codeActionProvider as configProvider } from "@src/features/config";
import { codeActionProvider as envProvider } from "@src/features/env";
import { codeActionProvider as inertiaProvider } from "@src/features/inertia";
import { codeActionProvider as translationProvider } from "@src/features/translation";
import { codeActionProvider as viewProvider } from "@src/features/view";
import * as vscode from "vscode";
import { CodeActionProviderFunction } from "..";

const providers: CodeActionProviderFunction[] = [
    envProvider,
    inertiaProvider,
    viewProvider,
    translationProvider,
    configProvider,
];

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
                .map((diagnostic) => {
                    const code =
                        typeof diagnostic.code === "object"
                            ? diagnostic.code?.value
                            : diagnostic.code;

                    if (typeof code !== "string") {
                        return [];
                    }

                    return providers.map((provider) =>
                        provider(code, diagnostic, document, range, token),
                    );
                })
                .flat(),
        ).then((actions) => actions.flat());
    }
}
