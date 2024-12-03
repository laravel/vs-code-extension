import { notFound } from "@src/diagnostic";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { DetectResult, LinkProvider } from "..";
import { getRoutes } from "../repositories/routes";

const toFind = {
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
};

const isCorrectIndexForMethod = (item: DetectResult, index: number) => {
    const indices: Record<string, number> = {
        fallback: 0,
        match: 2,
        newRoute: 2,
        addRoute: 2,
    };

    return index === (indices[item.method] ?? 1);
};

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const route = getRoutes().items.find(
                (route) => route.action === param.value,
            );

            if (!route || !route.filename || !route.line) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(route.filename).with({
                    fragment: `L${route.line}`,
                }),
            );
        },
    );
};

const diagnosticProvider = (
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
                // Intelliphense can take it from here
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

export { diagnosticProvider, linkProvider };
