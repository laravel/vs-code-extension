import { detectedRange, detectInDoc } from "@src/support/parser";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";
import { notFound } from "../diagnostic";
import { getAppBindings } from "../repositories/appBinding";
import { findHoverMatchesInDoc } from "../support/doc";
import { relativePath } from "../support/project";

const toFind = [
    { class: facade("App"), method: "make" },
    { class: null, method: "app" },
];

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getAppBindings,
        ({ param }) => {
            const appBinding = getAppBindings().items[param.value];

            if (!appBinding) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                appBinding.uri,
            );
        },
    );
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getAppBindings, (match) => {
        const binding = getAppBindings().items[match];

        if (!binding) {
            return null;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(
                [
                    "`" + binding.class + "`",
                    `[${relativePath(binding.uri.path)}](${binding.uri})`,
                ].join("\n\n"),
            ),
        );
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getAppBindings,
        ({ param }) => {
            const appBinding = getAppBindings().items[param.value];

            if (appBinding) {
                return null;
            }

            return notFound(
                "App binding",
                param.value,
                detectedRange(param),
                "appBinding",
            );
        },
    );
};

export { diagnosticProvider, hoverProvider, linkProvider };
