import { getViewByName, getViews } from "@src/repositories/views";
import { config } from "@src/support/config";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { LinkProvider } from "..";

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    const links: vscode.DocumentLink[] = [];
    const text = doc.getText();
    const lines = text.split("\n");

    lines.forEach((line, index) => {
        const match = line.match(/<\/?livewire:([^\s>]+)/);

        if (match && match.index !== undefined) {
            const componentName = match[1];
            // Standard component
            const viewName = `livewire.${componentName}`;

            const view = getViewByName(viewName, true);

            if (view) {
                links.push(
                    new vscode.DocumentLink(
                        new vscode.Range(
                            new vscode.Position(index, match.index + 1),
                            new vscode.Position(
                                index,
                                match.index + match[0].length,
                            ),
                        ),
                        vscode.Uri.file(projectPath(view.path)),
                    ),
                );
            }
        }
    });

    return Promise.resolve(links);
};

export const completionProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(
        doc: vscode.TextDocument,
        pos: vscode.Position,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (!config("livewireComponent.completion", true)) {
            return undefined;
        }

        const componentPrefix = "<livewire:";
        const pathPrefix = "livewire.";
        const line = doc.lineAt(pos.line).text;
        const linePrefix = line.substring(
            pos.character - componentPrefix.length,
            pos.character,
        );

        if (linePrefix !== componentPrefix) {
            return undefined;
        }

        return getViews()
            .items.filter((view) => view.key.startsWith(pathPrefix))
            .map((view) => {
                const parts = view.key.split(".");
                const filename = parts.at(-1);
                const directory = parts.at(-2);

                if (
                    filename === directory?.replace("⚡", "") &&
                    !view.path.endsWith(".blade.php") &&
                    view.path.endsWith(".php")
                ) {
                    const mfcView = { ...view };
                    mfcView.key = view.key.replace(`.${directory}`, "");

                    return mfcView;
                }

                return view;
            })
            .map(
                (view) =>
                    new vscode.CompletionItem(
                        view.key.replace(pathPrefix, "").replaceAll("⚡", ""),
                    ),
            );
    },
};
