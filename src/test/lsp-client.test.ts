import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { createClientOptions, createServerOptions } from "../lsp/options";
import {
    resolveWorkspaceProjectFolder,
    resolveWorkspaceProjectPath,
} from "../support/project";

const workspaceFolder = (fsPath: string): vscode.WorkspaceFolder => ({
    uri: vscode.Uri.file(fsPath),
    name: path.basename(fsPath),
    index: 0,
});

suite("Laravel LSP Client Test Suite", () => {
    const root = path.join(path.parse(process.cwd()).root, "repo");

    test("resolves an empty base path to the workspace root", () => {
        assert.strictEqual(
            resolveWorkspaceProjectPath(workspaceFolder(root), ""),
            root,
        );
    });

    test("resolves a nested base path inside the workspace root", () => {
        assert.strictEqual(
            resolveWorkspaceProjectPath(workspaceFolder(root), "backend"),
            path.join(root, "backend"),
        );
    });

    test("normalizes trailing separators in the base path", () => {
        assert.strictEqual(
            resolveWorkspaceProjectPath(workspaceFolder(root), "backend/"),
            path.join(root, "backend"),
        );
    });

    test("uses the resolved project path as the LSP working directory and root", () => {
        const projectFolder = resolveWorkspaceProjectFolder(
            workspaceFolder(root),
            "backend",
        );
        const serverOptions = createServerOptions(
            "/bin/laravel-lsp",
            projectFolder,
        ) as { options?: { cwd?: string } };
        const clientOptions = createClientOptions(projectFolder);

        assert.strictEqual(
            serverOptions.options?.cwd,
            path.join(root, "backend"),
        );
        assert.strictEqual(
            clientOptions.workspaceFolder?.uri.fsPath,
            path.join(root, "backend"),
        );
    });
});
