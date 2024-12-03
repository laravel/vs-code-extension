import { notFound } from "@src/diagnostic";
import { getAssets } from "@src/repositories/asset";
import { detectedRange, detectInDoc } from "@src/support/parser";
import * as vscode from "vscode";
import { LinkProvider } from "..";

const toFind = { class: null, method: "asset" };

const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getAssets,
        ({ param }) => {
            const asset = getAssets().items.find(
                (asset) => asset.path === param.value,
            )?.uri;

            if (!asset) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(asset.path),
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
        getAssets,
        ({ param }) => {
            const asset = getAssets().items.find(
                (item) => item.path === param.value,
            );

            if (asset) {
                return null;
            }

            return notFound(
                "Asset",
                param.value,
                detectedRange(param),
                "asset",
            );
        },
    );
};

export { diagnosticProvider, linkProvider };
