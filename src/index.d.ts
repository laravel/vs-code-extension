import * as vscode from "vscode";

interface Tags {
    classes: string[];
    functions: string[];
}

interface CompletionItemFunction {
    class: string | null;
    function: string | null;
    parameters: string[];
    paramIndex: number | null;
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
