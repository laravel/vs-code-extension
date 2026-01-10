import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getControllers } from "@src/repositories/controllers";
import { getRoutes } from "@src/repositories/routes";
import { config } from "@src/support/config";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { contract, facade } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import * as vscode from "vscode";
import { LinkProvider } from "..";
import { projectPath } from "@src/support/project";

const toFind = [
    {
        class: contract("Routing\\Registrar"),
        method: ["get", "post", "patch", "put", "delete", "options", "match"],
    },
    {
        class: facade("Route"),
        method: [
            "get",
            "post",
            "patch",
            "put",
            "delete",
            "options",
            "any",
            "match",
            "fallback",
            "addRoute",
            "newRoute",
        ],
    },
];

const isCorrectIndexForMethod = (
    item: AutocompleteParsingResult.ContextValue,
    index: number,
) => {
    const indices: Record<string, number> = {
        fallback: 0,
        match: 2,
        newRoute: 2,
        addRoute: 2,
    };

    // @ts-ignore
    return index === (indices[item.methodName ?? ""] ?? 1);
};

const findControllerFromDocument = (
    doc: vscode.TextDocument,
    position: vscode.Position,
): string | null => {
    const text = doc.getText();
    const currentOffset = doc.offsetAt(position);

    // Pattern to match ::controller() or ->controller() followed eventually by ->group(function
    // This handles Route::controller()->group() and Route::prefix()->controller()->group()
    const controllerPattern =
        /(?:->|::)controller\(([^)]+)::class\)[^;]*?->group\s*\(\s*function\s*\([^)]*\)\s*\{/gi;

    let match;
    let controllerClass: string | null = null;

    // Find all controller()->group() patterns in the document
    while ((match = controllerPattern.exec(text)) !== null) {
        const openBraceOffset = match.index + match[0].length - 1; // Position of opening {

        // Find the matching closing brace
        let braceCount = 1;
        let closeBraceOffset = openBraceOffset + 1;

        while (closeBraceOffset < text.length && braceCount > 0) {
            if (text[closeBraceOffset] === "{") {
                braceCount++;
            } else if (text[closeBraceOffset] === "}") {
                braceCount--;
            }
            closeBraceOffset++;
        }

        // Check if current position is inside this group
        if (
            currentOffset > openBraceOffset &&
            currentOffset < closeBraceOffset
        ) {
            // Extract the controller class name and remove ::class suffix
            controllerClass = match[1].trim().replace(/::class$/, "");
            break;
        }
    }

    return controllerClass;
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            let route = getRoutes().items.find(
                (route) => route.action === param.value,
            );

            // If no exact match and param doesn't contain @, try matching method name only
            // This handles Route::controller()->group() pattern
            if (!route && !param.value.includes("@")) {
                const position = new vscode.Position(
                    param.start?.line ?? 0,
                    param.start?.column ?? 0,
                );
                const controllerClass = findControllerFromDocument(doc, position);

                if (controllerClass) {
                    // Try to match with specific controller class
                    route = getRoutes().items.find((route) => {
                        const actionParts = route.action.split("@");
                        if (actionParts.length !== 2) {
                            return false;
                        }

                        const [routeController, routeMethod] = actionParts;

                        // Match if method name matches AND controller matches
                        if (routeMethod !== param.value) {
                            return false;
                        }

                        // Check if route controller ends with or equals the controller class
                        return (
                            routeController === controllerClass ||
                            routeController.endsWith(`\\${controllerClass}`)
                        );
                    });
                } else {
                    // Fallback: match any route with this method name
                    route = getRoutes().items.find((route) =>
                        route.action.endsWith(`@${param.value}`),
                    );
                }
            }

            if (!route || !route.filename || !route.line) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(projectPath(route.filename)).with({
                    fragment: `L${route.line}`,
                }),
            );
        },
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const action = param.value;

            if (!action.includes("@")) {
                return null;
            }

            const route = getRoutes().items.find((r) => r.action === action);

            if (route) {
                return null;
            }

            return notFound(
                "Controller/Method",
                param.value,
                detectedRange(param),
                "controllerAction",
            );
        },
    );
};

export const completionProvider = {
    tags() {
        return toFind;
    },

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (!config("controllerAction.completion", true)) {
            return [];
        }

        if (result.currentParamIsArray()) {
            return [];
        }

        const indexMapping = {
            match: 2,
        };

        // @ts-ignore
        const index = indexMapping[result.func()] ?? 1;

        if (!result.isParamIndex(index)) {
            return [];
        }

        return getControllers()
            .items.filter(
                (controller) =>
                    typeof controller === "string" && controller.length > 0,
            )
            .map((controller: string) => {
                let completionItem = new vscode.CompletionItem(
                    controller,
                    vscode.CompletionItemKind.Enum,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
    },
};
