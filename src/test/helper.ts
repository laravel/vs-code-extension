import * as assert from "assert";
import * as vscode from "vscode";

let extensionReady: Promise<void> | undefined;

export async function activateExtension(): Promise<void> {
    if (!extensionReady) {
        extensionReady = (async () => {
            const ext = vscode.extensions.getExtension(
                "laravel.vscode-laravel",
            );

            if (!ext) {
                throw new Error("Laravel extension not found");
            }

            if (!ext.isActive) {
                await ext.activate();
            }

            await sleep(2000);
        })().catch((error) => {
            extensionReady = undefined;
            throw error;
        });
    }

    await extensionReady;
}

export function uri(relativePath: string): vscode.Uri {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        throw new Error("No workspace folder found");
    }

    return vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
}

export async function openDocument(
    relativePath: string,
): Promise<vscode.TextDocument> {
    return vscode.workspace.openTextDocument(uri(relativePath));
}

export async function getCompletions(
    doc: vscode.TextDocument,
    position: vscode.Position,
): Promise<vscode.CompletionList> {
    return vscode.commands.executeCommand<vscode.CompletionList>(
        "vscode.executeCompletionItemProvider",
        doc.uri,
        position,
    );
}

export async function getLinks(
    doc: vscode.TextDocument,
): Promise<vscode.DocumentLink[]> {
    return vscode.commands.executeCommand<vscode.DocumentLink[]>(
        "vscode.executeLinkProvider",
        doc.uri,
    );
}

export async function getHovers(
    doc: vscode.TextDocument,
    position: vscode.Position,
): Promise<vscode.Hover[]> {
    return vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        doc.uri,
        position,
    );
}

export async function getDiagnostics(
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> {
    await vscode.window.showTextDocument(doc, {
        preview: false,
        preserveFocus: false,
    });

    const timeoutMs = 5000;
    const start = Date.now();
    let diagnostics = vscode.languages.getDiagnostics(doc.uri);

    while (diagnostics.length === 0 && Date.now() - start < timeoutMs) {
        await sleep(100);
        diagnostics = vscode.languages.getDiagnostics(doc.uri);
    }

    return diagnostics;
}

export function diagnosticCode(
    diagnostic: vscode.Diagnostic,
): string | undefined {
    if (typeof diagnostic.code === "string") {
        return diagnostic.code;
    }

    if (typeof diagnostic.code === "number") {
        return diagnostic.code.toString();
    }

    if (
        typeof diagnostic.code === "object" &&
        diagnostic.code &&
        "value" in diagnostic.code
    ) {
        return String(diagnostic.code.value);
    }

    return undefined;
}

export function hoverToText(hover: vscode.Hover): string {
    return hover.contents
        .map((content) => {
            if (typeof content === "string") {
                return content;
            }

            if ("value" in content) {
                return content.value;
            }

            return "";
        })
        .join("\n");
}

export function normalizeForCrossPlatformComparison(value: string): string {
    try {
        return decodeURIComponent(value).replace(/\\/g, "/").toLowerCase();
    } catch {
        return value.replace(/\\/g, "/").toLowerCase();
    }
}

export function includesNormalized(actual: string, expected: string): boolean {
    return normalizeForCrossPlatformComparison(actual).includes(
        normalizeForCrossPlatformComparison(expected),
    );
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

type QuickPickResult = {
    assertIncludes(label: string, message?: string): void;
};

export async function withQuickPick(options: {
    select: string;
    trigger: () => Thenable<unknown>;
}): Promise<QuickPickResult> {
    const originalShowQuickPick = vscode.window.showQuickPick;
    const labels: string[] = [];

    try {
        (
            vscode.window as {
                showQuickPick: typeof vscode.window.showQuickPick;
            }
        ).showQuickPick = (async (
            items:
                | readonly vscode.QuickPickItem[]
                | Thenable<readonly vscode.QuickPickItem[]>,
        ) => {
            const pickerItems = await Promise.resolve(items);

            labels.splice(
                0,
                labels.length,
                ...pickerItems.map((item) => item.label),
            );

            return (
                pickerItems.find((item) => item.label === options.select) ??
                undefined
            );
        }) as unknown as typeof vscode.window.showQuickPick;

        await options.trigger();
    } finally {
        (
            vscode.window as {
                showQuickPick: typeof vscode.window.showQuickPick;
            }
        ).showQuickPick = originalShowQuickPick;
    }

    return {
        assertIncludes(label: string, message?: string) {
            assert.ok(
                labels.includes(label),
                message ??
                    `Expected label "${label}" in picker, got: ${labels.join(", ")}`,
            );
        },
    };
}
