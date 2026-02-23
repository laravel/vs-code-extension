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
