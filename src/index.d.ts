import * as vscode from "vscode";

interface Tags {
    classes: string[];
    functions: string[];
}

interface CompletionItemFunction {
    class: string | null;
    fqn: string | null;
    function: string | null;
    parameters: string[];
    paramIndex: number;
}

interface Provider {
    tags(): Tags;
    provideCompletionItems(
        func: CompletionItemFunction,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[];
}
