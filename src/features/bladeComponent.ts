import { getViews } from "@src/repositories/views";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { LinkProvider } from "..";

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    const links: vscode.DocumentLink[] = [];
    const text = doc.getText();
    const lines = text.split("\n");
    const views = getViews().items;

    lines.forEach((line, index) => {
        const match = line.match(/<\/?x-([^\s>]+)/);

        if (match && match.index !== undefined) {
            const componentName = match[1];
            // Standard component
            const viewName = "components." + componentName;
            // Index component
            const altName = `${viewName}.${componentName}`;
            const view = views.find((v) => [viewName, altName].includes(v.key));

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
                        vscode.Uri.parse(projectPath(view.path)),
                    ),
                );
            }
        }
    });

    return Promise.resolve(links);
};
