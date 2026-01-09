import * as vscode from "vscode";
import path from "path";

export const getPathFromOutput = (
    output: string,
    command: string,
    workspaceFolder: vscode.WorkspaceFolder,
    uri: vscode.Uri,
): string | undefined => {
    if (command === "make:livewire") {
        const paths = output.match(/CLASS:\s+(.*)/);

        if (paths?.[1]) {
            return path.join(workspaceFolder.uri.fsPath, paths?.[1]);
        }
    }

    const paths = output.match(/\[(.*?)\]/g)?.map((path) => path.slice(1, -1));

    if (!paths) {
        return;
    }

    // If Artisan command creates multiple files,
    // locate the primary path in the output.
    const outputPath = paths
        .map((_path) =>
            path.isAbsolute(_path)
                ? path.relative(workspaceFolder.uri.fsPath, _path)
                : _path,
        )
        .map((_path) => path.join(workspaceFolder.uri.fsPath, _path))
        .find((_path) => _path.startsWith(uri.fsPath));

    if (!outputPath) {
        return;
    }

    return outputPath;
};
