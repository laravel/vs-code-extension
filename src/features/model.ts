import { HoverActions } from "@src/hoverAction/support";
import { getModelByClassname } from "@src/repositories/models";
import { detect } from "@src/support/parser";
import { AutocompleteParsingResult } from "@src/types";
import * as vscode from "vscode";

const isInHoverRange = (
    range: vscode.Range,
    method: AutocompleteParsingResult.MethodCall,
): boolean => {
    if (!method.start || !method.end) {
        return false;
    }

    // vs-code-php-parser-cli returns us the position of the entire node, for example:
    //
    // Example::popular()->active();
    //
    // but we need only the position of the method name, for example: active(),
    // so we cannot check the position by the exact equations, but this should be enough
    return (
        method.end.line === range.end.line &&
        method.start.column <= range.start.character &&
        method.end.column >= range.end.character
    );
};

export class ScopeHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);

        if (!range) {
            return null;
        }

        const scopeName = document.getText(range);

        return detect(document).then((results) => {
            if (!results) {
                return null;
            }

            const result = results
                .filter((result) => result.type === "methodCall")
                .find(
                    (result) =>
                        isInHoverRange(range, result) &&
                        result.methodName === scopeName,
                );

            if (!result || !result.className) {
                return null;
            }

            const model = getModelByClassname(result.className);

            if (!model || !model.uri) {
                return null;
            }

            const scope = model.scopes.find(
                (scope) => scope.name === scopeName,
            );

            if (!scope || !scope.uri) {
                return null;
            }

            const hoverActions = new HoverActions([
                {
                    title: "Go to implementation",
                    command: "laravel.open",
                    arguments: [
                        vscode.Uri.file(scope.uri),
                        scope.start_line,
                        0,
                    ],
                },
            ]);

            return new vscode.Hover(hoverActions.getAsMarkdownString(), range);
        });
    }
}
